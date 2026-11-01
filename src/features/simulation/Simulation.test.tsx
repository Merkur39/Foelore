import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { holdDown, MOCKUP_GEAR, MOCKUP_PIECES, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const slam = { fighter: 'Troll', attack: 'troll_groundslam' }
const blocking = () => screen.getByRole('group', { name: 'En bloquant' })
const parrying = () => screen.getByRole('group', { name: 'En parant' })
const hitLink = (name: RegExp) => screen.getByRole('link', { name })

async function openPicker(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Choisir une attaque' }))
  return screen.findByRole('dialog', { name: 'Choisir une attaque' })
}

describe('Simulation', () => {
  it('simulates the attack of its address against your gear', () => {
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')

    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol, 70 dégâts$/)).toBeInTheDocument()
    expect(blocking()).toHaveTextContent('tient')
    expect(blocking()).toHaveTextContent('barre : 16,4 / 60')
    expect(parrying()).toHaveTextContent('tient')
    expect(screen.getByText('Bloque-le : tu tiens sans tituber')).toBeInTheDocument()
    expect(screen.getByText('Esquivable en roulade')).toBeInTheDocument()
    expect(screen.getByText(/^Cette attaque porte 2 coups/)).toBeInTheDocument()
  })

  it('weighs the bar already filled before the hit', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: '75 %' }))

    expect(blocking()).toHaveTextContent('ne passe pas')
    expect(blocking()).toHaveTextContent('barre : déborde')
    expect(parrying()).toHaveTextContent('tient')
    expect(screen.getByText('Pare-le : le blocage cède')).toBeInTheDocument()
  })

  it('weighs the stars of the monster', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: '2★' }))

    expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol, 140 dégâts$/)).toBeInTheDocument()
    expect(blocking()).toHaveTextContent('ne passe pas')
  })

  it('takes a free value instead of an attack', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: 'Valeur libre' }))

    expect(screen.getByRole('group', { name: 'Dégâts du coup' })).toHaveTextContent('90')
    expect(screen.queryByText('Esquivable en roulade')).not.toBeInTheDocument()
    for (let step = 0; step < 8; step += 1) {
      await user.click(screen.getByRole('button', { name: 'Monter de 5' }))
    }
    expect(screen.getByRole('group', { name: 'Dégâts du coup' })).toHaveTextContent('130')
    expect(blocking()).toHaveTextContent('tu titubes')
    expect(screen.getByText('Pare-le : en bloquant, tu titubes')).toBeInTheDocument()
  })

  it('keeps raising the free value while its button is held', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await user.click(screen.getByRole('button', { name: 'Valeur libre' }))
    await holdDown(screen.getByRole('button', { name: 'Monter de 5' }), 1000)

    const value = Number(screen.getByRole('group', { name: 'Dégâts du coup' }).textContent)
    expect(value).toBeGreaterThan(90 + 3 * 5)
  })

  it('says when the item cannot parry', () => {
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')

    renderWithStore(<App />, {
      language: 'fr',
      gear: { ...MOCKUP_GEAR, blocker: 'ShieldWoodTower', level: 1 },
    })

    expect(parrying()).toHaveTextContent('Ton objet ne pare pas')
  })

  it('keeps the attacks simulated among the recent ones', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
    const { store } = renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    await waitFor(() => {
      expect(store.getState().recentAttacks).toEqual([slam])
    })
    await user.click(hitLink(/^Changer d'attaque/))

    const picker = await screen.findByRole('dialog', { name: 'Choisir une attaque' })
    const recent = within(picker).getByRole('region', { name: 'Récentes' })
    expect(within(recent).getByRole('link', { name: /^Troll · Frappe au sol/ })).toBeInTheDocument()
  })

  it('names the enemy after the biome it comes from when another bears its name', () => {
    window.history.replaceState(null, '', '#/simulation/Skeleton_Swamps/skeleton_sword_swamps')

    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    expect(
      hitLink(/^Changer d'attaque : Squelette · Marécages, Épée, 48 dégâts$/),
    ).toHaveTextContent('Squelette · Marécages · Épée')
  })

  it('picks an attack among the enemies of a biome, through the sheet of the creature', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
    const picker = await openPicker(user)

    await user.click(within(picker).getByRole('button', { name: 'Biome suivant : Forêt noire' }))
    await user.click(within(picker).getByRole('link', { name: /^Troll/ }))
    await screen.findByRole('heading', { level: 1, name: 'Troll' })
    await user.click(screen.getByRole('link', { name: /^Frappe au sol,/ }))

    expect(
      await screen.findByRole('link', { name: /^Changer d'attaque : Troll, Frappe au sol/ }),
    ).toBeInTheDocument()
  })

  it('opens an attack found by the search straight in the Simulation', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
    const picker = await openPicker(user)

    await user.type(
      within(picker).getByRole('searchbox', { name: 'Rechercher un ennemi ou une attaque' }),
      'frappe',
    )
    const attacks = await within(picker).findByRole('region', { name: /^Attaques · \d+$/ })
    await user.click(within(attacks).getByRole('link', { name: /^Troll · Frappe au sol/ }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol/)).toBeInTheDocument()
  })

  it('sets apart, in the search, the attacks of enemies of one name', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/simulation')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
    const picker = await openPicker(user)

    await user.type(
      within(picker).getByRole('searchbox', { name: 'Rechercher un ennemi ou une attaque' }),
      'épée',
    )

    const attacks = await within(picker).findByRole('region', { name: /^Attaques · \d+$/ })
    expect(
      within(attacks).getByRole('link', { name: /^Squelette · Montagne · Épée/ }),
    ).toBeInTheDocument()
  })

  describe('with your temporary effects', () => {
    const CARRYING = {
      ...MOCKUP_GEAR,
      armor: 0,
      pieces: MOCKUP_PIECES,
      carried: {
        trinket: 'TrinketIronHealth',
        power: 'GP_Bonemass',
        drinks: ['Potion_frostresist'],
        group: [],
      },
    }
    const card = () => screen.getByRole('button', { name: /^Avec tes effets temporaires/ })
    const effects = () => screen.getByRole('group', { name: 'Tes effets temporaires' })
    const effect = (name: string) => within(effects()).getByRole('switch', { name })

    it("counts what is switched on: the Lox's Bite, which staggers a block, then holds", async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Lox/lox_bite')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      expect(blocking()).toHaveTextContent('tu titubes')
      expect(blocking()).toHaveTextContent('15,1 subis')
      expect(blocking()).toHaveTextContent('−10 endurance')

      await user.click(card())
      await user.click(effect('Broche en fer'))
      await user.click(effect("Masse-d'Os"))

      expect(blocking()).toHaveTextContent('tient')
      expect(blocking()).toHaveTextContent('5,9 subis')
      expect(blocking()).toHaveTextContent('+5 endurance')
      expect(parrying()).toHaveTextContent('2,6 subis')
      expect(parrying()).toHaveTextContent('+10 endurance')
      expect(screen.getByText('Bloque-le : tu tiens sans tituber')).toBeInTheDocument()
    })

    it('greys what changes nothing against the attack: no frost in the Bite', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Lox/lox_bite')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })

      await user.click(card())

      expect(effects()).toHaveTextContent('Ne change rien : pas de glace')
      expect(
        within(effects()).queryByRole('switch', { name: 'Hydromel de résistance au gel' }),
      ).not.toBeInTheDocument()
    })

    it('leaves them out of a free value, which has no type to resist', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Lox/lox_bite')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      await user.click(card())
      await user.click(effect("Masse-d'Os"))

      await user.click(screen.getByRole('button', { name: 'Valeur libre' }))

      expect(
        screen.queryByRole('button', { name: /^Avec tes effets temporaires/ }),
      ).not.toBeInTheDocument()
      expect(blocking()).not.toHaveTextContent('+5 endurance')

      await user.click(screen.getByRole('button', { name: "Attaque d'un monstre" }))

      expect(card()).toHaveTextContent("Masse-d'Os")
    })
  })

  describe('Détails', () => {
    const details = () => screen.getByRole('button', { name: /^Détails/ })
    const opened = () => screen.getByRole('group', { name: 'Détails' })
    const row = (guard: string) => within(opened()).getByRole('group', { name: guard })
    // Open, « Détails » has a line of each guard's name too: the card comes first.
    const card = (guard: string) => screen.getAllByRole('group', { name: guard })[0]!
    const bar = (of: HTMLElement) => within(of).getByRole('img')

    it('folds what the game rolls under the cards, closed at first', () => {
      window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      expect(details()).toHaveAttribute('aria-expanded', 'false')
      expect(details()).toHaveTextContent('Chaque coup varie de 87 à 100 %')
      expect(screen.queryByRole('group', { name: 'Détails' })).not.toBeInTheDocument()
      expect(bar(blocking())).toHaveAccessibleName('Barre de stagger : 16,4 sur 60')
    })

    it('gives, open, what each guard takes from the lowest roll to the highest, the bars drawn so', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      await user.click(details())

      expect(details()).toHaveAttribute('aria-expanded', 'true')
      expect(row('En bloquant')).toHaveTextContent('0,7 à 1,3 subis')
      expect(row('En bloquant')).toHaveTextContent('barre 12,1 à 16,4 / 60')
      expect(row('En parant')).toHaveTextContent('0,3 à 0,6 subis')
      expect(bar(card('En bloquant'))).toHaveAccessibleName('Barre de stagger : 12,1 à 16,4 sur 60')
      expect(card('En bloquant')).toHaveTextContent('1,3 subis')
    })

    it('says how often the verdict comes when the roll changes it', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      await user.click(screen.getByRole('button', { name: 'Valeur libre' }))
      for (let step = 0; step < 8; step += 1) {
        await user.click(screen.getByRole('button', { name: 'Monter de 5' }))
      }

      await user.click(details())

      expect(card('En bloquant')).toHaveTextContent('tu titubes')
      expect(row('En bloquant')).toHaveTextContent('tu titubes 1 fois sur 3, sinon tu tiens')
      expect(row('En bloquant')).not.toHaveTextContent('barre')
      expect(bar(card('En bloquant'))).toHaveAccessibleName(
        'Barre de stagger : 47,6 sur 60 au plus bas, elle peut déborder',
      )
    })

    it('tells the fire apart, up to what burns at the top of the roll', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Goblin/GoblinTorch')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      await user.click(details())

      expect(card('En bloquant')).toHaveTextContent('3,5 subis')
      expect(row('En bloquant')).toHaveTextContent('1 à 1,7 subis')
      expect(row('En bloquant')).toHaveTextContent("puis jusqu'à 1,7 de feu en 5 s")
      expect(row('En parant')).toHaveTextContent('trop peu de feu passe pour brûler')
    })

    it('tells the poison apart, over its seconds', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Leech/Leech_BiteAttack')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      await user.click(details())

      expect(row('En bloquant')).toHaveTextContent('0,4 à 0,8 subis')
      expect(row('En bloquant')).toHaveTextContent('puis 1,5 à 2,7 de poison en 3 à 4 s')
    })

    it('reads a hit no guard takes on one line, and says when the game does not roll it', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Fader/Fader_Flamebreath')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      expect(details()).toHaveTextContent('Ce coup ne varie pas')
      await user.click(details())

      expect(row('Le coup')).toHaveTextContent('0 subis')
      expect(row('Le coup')).toHaveTextContent('puis 20 de feu en 5 s')
      expect(within(opened()).queryByRole('group', { name: 'En bloquant' })).not.toBeInTheDocument()
    })

    it('leaves them out for a hit the game does not roll that leaves nothing over time', () => {
      window.history.replaceState(
        null,
        '',
        '#/simulation/Fenring_Cultist_Hildir/Fenring_attack_IceNova',
      )
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      expect(screen.queryByRole('button', { name: /^Détails/ })).not.toBeInTheDocument()
    })

    it('stays open from one attack to the next', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      await user.click(details())

      act(() => {
        window.location.hash = '#/simulation/Leech/Leech_BiteAttack'
      })

      await waitFor(() => {
        expect(opened()).toHaveTextContent('de poison')
      })
    })

    it('reads in English', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/simulation/Goblin/GoblinTorch')
      renderWithStore(<App />, { language: 'en', gear: MOCKUP_GEAR })

      const button = screen.getByRole('button', { name: /^Details/ })
      expect(button).toHaveTextContent('Every hit varies from 87 to 100%')
      await user.click(button)

      const blocked = within(screen.getByRole('group', { name: 'Details' })).getByRole('group', {
        name: 'Blocking',
      })
      expect(blocked).toHaveTextContent('1 to 1.7 taken')
      expect(blocked).toHaveTextContent('then up to 1.7 fire over 5 s')
      expect(blocked).toHaveTextContent('bar 10.4 to 14.2 / 60')
    })
  })

  describe('on a desktop', () => {
    it('picks an enemy, then one of its attacks, in the dialog', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/simulation')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      const picker = await openPicker(user)

      await user.click(within(picker).getByRole('button', { name: 'Biome suivant : Forêt noire' }))
      await user.click(within(picker).getByRole('button', { name: /^Troll/ }))
      await user.click(within(picker).getByRole('link', { name: /^Frappe au sol,/ }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(hitLink(/^Changer d'attaque : Troll, Frappe au sol/)).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 1, name: 'Simulation' })).toBeInTheDocument()
    })
  })
})
