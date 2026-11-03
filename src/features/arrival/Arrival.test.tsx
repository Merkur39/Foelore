import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import type { AppState } from '@/app/store'
import { DEFAULT_STATE } from '@/app/store'
import { MOCKUP_GEAR, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const firstLaunch = (state: Partial<AppState> = {}) =>
  renderWithStore(<App />, { language: 'fr', onboarding: false, ...state })

const question = (name: string) => screen.findByRole('dialog', { name })

async function answerWhere(user: UserEvent, biome: string) {
  const dialog = await question('Où en es-tu ?')
  await user.click(within(dialog).getByRole('radio', { name: biome }))
  await user.click(within(dialog).getByRole('button', { name: 'Suivant' }))
  return question('Ton équipement')
}

/** Holds the bronze buckler, picked among the shields in the list of what is held: the question comes
 * back with it. */
async function holdBronze(user: UserEvent, dialog: HTMLElement) {
  await user.click(within(dialog).getByRole('button', { name: /^En main : (?!niveau )/ }))
  // A new character holds nothing: the list opens on the rest, beside the shields.
  await user.click(within(dialog).getByRole('button', { name: /^Boucliers / }))
  await user.click(
    within(dialog).getByRole('button', {
      name: /^(Bouclier en bronze\. |Choisir : Bouclier en bronze$)/,
    }),
  )
}

describe('The first arrival', () => {
  it('asks first where the player fights, out of the biomes of the game', async () => {
    firstLaunch()

    const dialog = await question('Où en es-tu ?')

    expect(dialog).toHaveTextContent('1 sur 3')
    expect(dialog).toHaveTextContent('Le biome où tu te bats en ce moment.')
    const biomes = within(dialog).getByRole('radiogroup', { name: 'Où en es-tu ?' })
    expect(within(biomes).getAllByRole('radio')).toHaveLength(9)
    expect(within(biomes).getByRole('radio', { name: 'Prairies' })).toBeChecked()
    expect(within(biomes).getByRole('radio', { name: 'Océan' })).not.toBeChecked()
  })

  it('is never asked again once behind the player', () => {
    renderWithStore(<App />, { language: 'fr', onboarding: true })

    expect(screen.queryByRole('dialog', { name: 'Où en es-tu ?' })).not.toBeInTheDocument()
  })

  it('keeps the biome for the end on Suivant, then asks for the gear', async () => {
    const user = userEvent.setup()
    const { store } = firstLaunch()

    const dialog = await answerWhere(user, 'Forêt noire')

    expect(store.getState().biome).toBeNull()
    expect(dialog).toHaveTextContent('2 sur 3')
    expect(dialog).toHaveTextContent('Ce que tu tiens en main gauche, et tes stats défensives.')
  })

  it('asks for the gear with the form of Ton équipement, worked out as it changes', async () => {
    const user = userEvent.setup()
    const { store } = firstLaunch()
    const dialog = await answerWhere(user, 'Forêt noire')

    await holdBronze(user, dialog)
    await user.click(within(dialog).getByRole('button', { name: 'En main : niveau supérieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'En main : niveau supérieur' }))

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(within(withstand).getByRole('group', { name: 'Bloquer' })).toHaveTextContent('VD 28')
    expect(store.getState().gear).toEqual(DEFAULT_STATE.gear)
  })

  it("asks for your own gear: the group's powers wait for Ton équipement", async () => {
    const user = userEvent.setup()
    firstLaunch()
    const dialog = await answerWhere(user, 'Forêt noire')

    expect(within(dialog).getByRole('region', { name: 'Ce que tu emportes' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('region', { name: 'Du groupe' })).not.toBeInTheDocument()
  })

  it('opens a row’s list under the question’s step, and comes back to the question', async () => {
    const user = userEvent.setup()
    firstLaunch()
    const dialog = await answerWhere(user, 'Forêt noire')

    await user.click(within(dialog).getByRole('button', { name: 'Casque : Aucun' }))

    expect(dialog).toHaveAccessibleName('Ton casque')
    expect(dialog).toHaveTextContent('2 sur 3')
    expect(dialog).toHaveTextContent('Question 2 · Ton équipement')
    expect(within(dialog).getByRole('button', { name: 'Passer' })).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Suivant' })).not.toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: /^Casque en bronze\. / }))

    expect(dialog).toHaveAccessibleName('Ton équipement')
    expect(
      within(dialog).getByRole('button', { name: 'Casque : Casque en bronze' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Suivant' })).toBeInTheDocument()
  })

  it('opens a row’s list at its top, and comes back to the question where it was left', async () => {
    const user = userEvent.setup()
    firstLaunch()
    const dialog = await answerWhere(user, 'Forêt noire')
    const body = dialog.querySelector('header + div')!
    const scroll = (top: number) => {
      body.scrollTop = top
      fireEvent.scroll(body)
    }
    scroll(300)

    await user.click(within(dialog).getByRole('button', { name: 'Casque : Aucun' }))

    expect(body.scrollTop).toBe(0)

    scroll(500)
    await user.click(within(dialog).getByRole('button', { name: /^Casque en bronze\. / }))

    expect(body.scrollTop).toBe(300)
  })

  it('keeps the gear for the end on Suivant, then asks for the world', async () => {
    const user = userEvent.setup()
    const { store } = firstLaunch()
    const gear = await answerWhere(user, 'Forêt noire')

    await holdBronze(user, gear)
    await user.click(within(gear).getByRole('button', { name: 'Suivant' }))

    expect(store.getState().gear).toEqual(DEFAULT_STATE.gear)
    const world = await question('Ton monde')
    expect(world).toHaveTextContent('3 sur 3')
    expect(within(world).getByRole('radio', { name: 'Normal ×1' })).toBeChecked()
  })

  it('saves every answer as it ends, on the Bestiary of the biome picked, and asks no more', async () => {
    const user = userEvent.setup()
    const { store } = firstLaunch()
    const gear = await answerWhere(user, 'Forêt noire')
    await holdBronze(user, gear)
    await user.click(within(gear).getByRole('button', { name: 'Suivant' }))
    const world = await question('Ton monde')

    await user.click(within(world).getByRole('radio', { name: 'Difficile ×1,5' }))
    await user.click(within(world).getByRole('button', { name: '3' }))
    await user.click(within(world).getByRole('button', { name: 'Voir la Forêt noire' }))

    expect(world).not.toBeInTheDocument()
    expect(store.getState()).toMatchObject({
      biome: 'blackForest',
      gear: { blocker: 'ShieldBronzeBuckler' },
      world: { difficulty: 'hard', players: 3 },
      onboarding: true,
    })
    expect(window.location.hash).toBe('#/bestiary/blackForest')
    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Forêt noire')
  })

  it('changes nothing in the app behind it before it ends, on a desktop', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    firstLaunch()
    const gear = await answerWhere(user, 'Forêt noire')

    await holdBronze(user, gear)
    await user.click(within(gear).getByRole('button', { name: 'Suivant' }))

    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Prairies')
    expect(screen.getByRole('link', { name: /^Ton équipement :/ })).toHaveAccessibleName(
      /Sans armes/,
    )
  })

  it('names the biome picked on its last button', async () => {
    const user = userEvent.setup()
    firstLaunch()
    const gear = await answerWhere(user, 'Océan')
    await user.click(within(gear).getByRole('button', { name: 'Suivant' }))

    const world = await question('Ton monde')

    expect(within(world).getByRole('button', { name: "Voir l'Océan" })).toBeInTheDocument()
  })

  it('goes back to the question before, its answer kept', async () => {
    const user = userEvent.setup()
    firstLaunch()
    const gear = await answerWhere(user, 'Marécages')

    await user.click(within(gear).getByRole('button', { name: 'Question précédente' }))

    const where = await question('Où en es-tu ?')
    expect(within(where).getByRole('radio', { name: 'Marécages' })).toBeChecked()
  })

  it('skips the questions left on Passer, the one on screen unsaved', async () => {
    const user = userEvent.setup()
    const { store } = firstLaunch()
    const gear = await answerWhere(user, 'Forêt noire')

    await holdBronze(user, gear)
    await user.click(within(gear).getByRole('button', { name: 'Passer' }))

    expect(gear).not.toBeInTheDocument()
    expect(store.getState()).toMatchObject({
      biome: 'blackForest',
      gear: DEFAULT_STATE.gear,
      onboarding: true,
    })
    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Forêt noire')
  })

  it('ends as Passer does on any other way out: Escape, on a desktop', async () => {
    const user = userEvent.setup()
    const { store } = firstLaunch()
    const dialog = await answerWhere(user, 'Montagne')

    act(() => {
      // What the browser does on Escape: it closes the dialog.
      ;(dialog as HTMLDialogElement).close()
    })

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState()).toMatchObject({ biome: 'mountain', onboarding: true })
  })

  it('asks a player of an earlier version once, on the settings already set', async () => {
    const user = userEvent.setup()
    firstLaunch({ gear: MOCKUP_GEAR, biome: 'mountain' })

    const where = await question('Où en es-tu ?')
    expect(within(where).getByRole('radio', { name: 'Montagne' })).toBeChecked()
    await user.click(within(where).getByRole('button', { name: 'Suivant' }))

    const gear = await question('Ton équipement')
    const withstand = within(gear).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(within(withstand).getByRole('group', { name: 'Bloquer' })).toHaveTextContent('VD 81')
  })

  it('starts on the biome a link names', async () => {
    window.history.replaceState(null, '', '#/bestiary/plains')
    firstLaunch()

    const where = await question('Où en es-tu ?')

    expect(within(where).getByRole('radio', { name: 'Plaines' })).toBeChecked()
  })

  describe('on a desktop', () => {
    it('goes back in words, beside Suivant', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      firstLaunch()

      const gear = await answerWhere(user, 'Forêt noire')

      expect(within(gear).getByRole('button', { name: 'Précédent' })).toBeInTheDocument()
      expect(
        within(gear).queryByRole('button', { name: 'Question précédente' }),
      ).not.toBeInTheDocument()
    })
  })

  it('speaks English', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'en', onboarding: false })

    const where = await question('Where are you?')
    expect(where).toHaveTextContent('1 of 3')
    await user.click(within(where).getByRole('radio', { name: 'Black Forest' }))
    await user.click(within(where).getByRole('button', { name: 'Next' }))
    await user.click(within(await question('Your gear')).getByRole('button', { name: 'Next' }))

    const world = await question('Your world')
    expect(within(world).getByRole('button', { name: 'See the Black Forest' })).toBeInTheDocument()
    expect(within(world).getByRole('button', { name: 'Skip' })).toBeInTheDocument()
  })
})
