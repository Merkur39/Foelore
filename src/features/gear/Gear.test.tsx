import { fireEvent, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import {
  holdDown,
  MOCKUP_GEAR,
  MOCKUP_PIECES,
  openContext,
  renderWithStore,
} from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

// The mockups' gear, worn as pieces rather than typed: the same armor, 45.
const WORN = { ...MOCKUP_GEAR, armor: 0, pieces: MOCKUP_PIECES }
const fr = { language: 'fr', gear: WORN } as const
const chip = () => screen.getByRole('link', { name: /^Ton équipement :/ })

async function openGear(user: UserEvent) {
  await openContext(user)
  await user.click(chip())
  return screen.findByRole('dialog', { name: 'Ton équipement' })
}

const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/** Opens a row's list and picks an item there (in the category `pill` of what is held), its card on a
 * phone, « Choisir » on a desktop: Your gear comes back with it. */
async function pick(
  user: UserEvent,
  dialog: HTMLElement,
  row: string,
  item: string,
  pill?: string,
) {
  await user.click(
    within(dialog).getByRole('button', { name: new RegExp(`^${row} : (?!niveau )`) }),
  )
  if (pill) await user.click(within(dialog).getByRole('button', { name: new RegExp(`^${pill} `) }))
  await user.click(
    within(dialog).getByRole('button', {
      name: new RegExp(`^(${escaped(item)}[,.] |Choisir : ${escaped(item)}$)`),
    }),
  )
}

/** The body of a dialog, which scrolls under its header. */
const body = (dialog: HTMLElement) => dialog.querySelector('header + div')!
/** Scrolls the body of a dialog, as the player would. */
function scroll(dialog: HTMLElement, top: number) {
  body(dialog).scrollTop = top
  fireEvent.scroll(body(dialog))
}

describe('Your gear', () => {
  it('opens from its chip and shows what you can take with an empty bar', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)

    const dialog = await openGear(user)

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    const block = within(withstand).getByRole('group', { name: 'Bloquer' })
    expect(block).toHaveTextContent('VD 81')
    expect(block).toHaveTextContent('sans tituber 124 · tient 139')
    const parry = within(withstand).getByRole('group', { name: 'Parer' })
    expect(parry).toHaveTextContent('VD 121,5')
    expect(parry).toHaveTextContent('sans tituber 151 · tient 170')
    expect(withstand).toHaveTextContent('Titube à 60 (40 % de 150 PV) · armure 45')
  })

  it('names the zones of the gauges once, in a legend, on a phone', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)

    const dialog = await openGear(user)

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(within(withstand).getByText('ne passe pas')).toBeInTheDocument()
    expect(within(withstand).getAllByText('sans tituber')).toHaveLength(3)
  })

  it('keeps the words beside the numbers on a desktop, with no legend', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    renderWithStore(<App />, fr)

    const dialog = await openGear(user)

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(within(withstand).queryByText('ne passe pas')).not.toBeInTheDocument()
    expect(within(withstand).getByRole('group', { name: 'Bloquer' })).toHaveTextContent(
      'sans tituber 124 · tient 139',
    )
  })

  it('works out what you can take again as the gear changes, before it is saved', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.clear(within(dialog).getByRole('textbox', { name: 'PV max' }))
    await user.type(within(dialog).getByRole('textbox', { name: 'PV max' }), '200')
    await pick(user, dialog, 'En main', 'Écu en bois')

    const withstand = within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })
    expect(withstand).toHaveTextContent('Titube à 80 (40 % de 200 PV)')
    expect(within(withstand).getByRole('group', { name: 'Parer' })).toHaveTextContent(
      'ton objet ne pare pas',
    )
  })

  it('takes the Blocking skill in a field, as the max health', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const skill = within(dialog).getByRole('textbox', { name: 'Compétence Blocage' })

    expect(skill).toHaveValue('25')

    await user.clear(skill)
    await user.type(skill, '50')

    expect(within(dialog).getByRole('group', { name: 'Bloquer' })).toHaveTextContent('VD 90')
  })

  it('keeps raising the max health while its button is held', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await holdDown(within(dialog).getByRole('button', { name: 'Plus de PV' }), 1000)

    const health = within(dialog).getByRole('textbox', { name: 'PV max' })
    expect(Number((health as HTMLInputElement).value)).toBeGreaterThan(MOCKUP_GEAR.maxHealth + 3)
  })

  it('saves the gear on Valider: the chip follows', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.click(within(dialog).getByRole('button', { name: 'En main : niveau inférieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().gear).toEqual({ ...WORN, level: 2 })
    await openContext(user)
    expect(chip()).toHaveTextContent('N2 · VD 74,25')
  })

  it('changes nothing when closed without saving', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, fr)
    const dialog = await openGear(user)

    await user.click(within(dialog).getByRole('button', { name: 'En main : niveau inférieur' }))
    await user.click(within(dialog).getByRole('button', { name: 'Fermer sans enregistrer' }))

    expect(dialog).not.toBeInTheDocument()
    expect(store.getState().gear).toEqual(WORN)
  })

  it("keeps the level within the item's, past its max only for the Forge of Potential", async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const raise = () => within(dialog).getByRole('button', { name: 'En main : niveau supérieur' })

    await pick(user, dialog, 'En main', 'Lanterne dvergr', 'Autres')

    expect(within(dialog).getByRole('group', { name: 'En main : niveau 1' })).toHaveTextContent(
      'N1',
    )
    expect(raise()).toBeDisabled()

    await pick(user, dialog, 'En main', 'Bouclier en argent', 'Boucliers')
    for (let step = 1; step < 12; step += 1) {
      if (!(raise() as HTMLButtonElement).disabled) await user.click(raise())
    }

    expect(within(dialog).getByRole('group', { name: 'En main : niveau 10' })).toBeInTheDocument()
  })

  it('keeps raising the level while its button is held, up to the max', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, fr)
    const dialog = await openGear(user)
    const raise = within(dialog).getByRole('button', { name: 'En main : niveau supérieur' })

    await holdDown(raise, 2000)

    expect(within(dialog).getByRole('group', { name: 'En main : niveau 10' })).toBeInTheDocument()
    expect(raise).toBeDisabled()
  })

  describe('its armor pieces', () => {
    it('adds up the armor of the pieces worn, and the resistances they bring', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })
      expect(
        within(pieces).getByRole('button', { name: 'Casque : Casque en fer' }),
      ).toBeInTheDocument()
      expect(within(pieces).getByRole('group', { name: 'Cape : niveau 3' })).toHaveTextContent('N3')
      expect(pieces).toHaveTextContent('Armure45')
      expect(pieces).toHaveTextContent('14 + 14 + 14 + 3')
      expect(within(pieces).getByRole('list', { name: 'Tes résistances' })).toHaveTextContent(
        'Glace · Résistant ×0,5',
      )
    })

    it('follows a piece and its level, a weakness included, and so does what you can take', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await pick(user, dialog, 'Plastron', 'Cuirasse de racines')
      await user.click(within(dialog).getByRole('button', { name: 'Cape : niveau supérieur' }))

      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })
      expect(pieces).toHaveTextContent('Armure40')
      expect(pieces).toHaveTextContent('14 + 8 + 14 + 4')
      const resistances = within(pieces).getByRole('list', { name: 'Tes résistances' })
      expect(resistances).toHaveTextContent('Perforant · Résistant ×0,5')
      expect(resistances).toHaveTextContent('Feu · Faible ×1,5')
      expect(within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })).toHaveTextContent(
        'armure 40',
      )
    })

    it('empties a slot with « Aucun casque » at the head of its list, its level with it', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'Casque : Casque en fer' }))
      await user.click(
        within(dialog).getByRole('button', { name: 'Aucun casque, retire celui que tu portes.' }),
      )

      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })
      expect(pieces).toHaveTextContent('Armure31')
      expect(
        within(pieces).getByRole('button', { name: 'Casque : niveau supérieur' }),
      ).toBeDisabled()
    })

    it('shows a complete set, by its name in the game, and what it changes', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      for (const [slot, piece] of [
        ['Casque', 'Capuche de Fenris'],
        ['Plastron', 'Manteau de Fenris'],
        ['Jambières', 'Braies de Fenris'],
      ] as const) {
        await pick(user, dialog, slot, piece)
      }

      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })
      const set = within(pieces).getByRole('group', { name: 'Ensemble complet' })
      expect(set).toHaveTextContent('Bénédiction de Fenris')
      expect(set).toHaveTextContent('Feu ×0,5')
      expect(within(pieces).getByRole('list', { name: 'Tes résistances' })).toHaveTextContent(
        'Feu · Résistant ×0,5',
      )
    })

    it("keeps an earlier player's typed armor until they pick a piece, which takes its place", async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      const dialog = await openGear(user)
      const pieces = within(dialog).getByRole('region', { name: "Pièces d'armures" })

      expect(pieces).toHaveTextContent('Armure45')
      expect(pieces).toHaveTextContent('Armure tapée avant cette version')

      await pick(user, dialog, 'Plastron', "Armure d'écailles de fer")
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear).toEqual({
        ...MOCKUP_GEAR,
        armor: 0,
        pieces: { chest: { id: 'ArmorIronChest', level: 1 } },
      })
    })
  })

  describe('what you carry', () => {
    const CARRYING = {
      ...WORN,
      carried: {
        trinket: 'TrinketIronHealth',
        power: 'GP_Bonemass',
        drinks: ['Potion_frostresist'],
        group: [],
      },
    }
    const carry = (dialog: HTMLElement) =>
      within(dialog).getByRole('region', { name: 'Ce que tu emportes' })

    it('lists the trinket, the power and the drinks, how long each lasts and what it changes', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      const section = carry(await openGear(user))

      expect(
        within(section).getByRole('button', { name: 'Bibelot : Broche en fer' }),
      ).toBeInTheDocument()
      expect(section).toHaveTextContent("30 s dès 65 d'adrénaline · armure +20")
      expect(
        within(section).getByRole('button', { name: "Pouvoir : Masse-d'Os" }),
      ).toBeInTheDocument()
      expect(section).toHaveTextContent('5 min · Contondant, Coupant et Perforant ×0,75')
      expect(section).toHaveTextContent("bloquer rend 5 d'endurance")
      expect(
        within(section).getByRole('button', { name: 'Boisson : Hydromel de résistance au gel' }),
      ).toBeInTheDocument()
      expect(section).toHaveTextContent('10 min · Glace ×0,5')
      expect(section).toHaveTextContent(
        "Pas comptés d'office : allume-les sur la fiche d'une créature ou dans la Simulation, quand ils sont actifs.",
      )
    })

    it('says of a power that changes no hit that it changes none', async () => {
      const user = userEvent.setup()
      const carried = { ...CARRYING.carried, power: 'GP_TheElder' }
      renderWithStore(<App />, { language: 'fr', gear: { ...CARRYING, carried } })
      const section = carry(await openGear(user))

      expect(within(section).getByRole('button', { name: "Pouvoir : L'Aîné" })).toBeInTheDocument()
      expect(section).toHaveTextContent('5 min · ne change aucun coup')
    })

    it('carries nothing at first: no trinket, no power, a way to add a drink', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const section = carry(await openGear(user))

      expect(within(section).getByRole('button', { name: 'Bibelot : Aucun' })).toBeInTheDocument()
      expect(within(section).getByRole('button', { name: 'Pouvoir : Aucun' })).toBeInTheDocument()
      expect(within(section).queryByRole('button', { name: /^Boisson : / })).not.toBeInTheDocument()
      expect(
        within(section).getByRole('button', { name: 'Ajouter une boisson' }),
      ).toBeInTheDocument()
    })

    it('adds a drink not carried yet, swaps one, and takes one off', async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'Ajouter une boisson' }))
      expect(dialog).toHaveAccessibleName('Une boisson de plus')
      expect(dialog).toHaveTextContent(
        "Ton Hydromel de résistance au gel est déjà emporté : une boisson ne se prend qu'une fois.",
      )
      expect(
        within(dialog).queryByRole('button', { name: /^Hydromel de résistance au gel/ }),
      ).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: /^Hydromel des berserkir\. / }))

      expect(carry(dialog)).toHaveTextContent('20 s · Contondant, Coupant et Perforant ×1,5')
      await user.click(
        within(dialog).getByRole('button', { name: 'Boisson : Hydromel de résistance au gel' }),
      )
      await user.click(
        within(dialog).getByRole('button', { name: /^Vin d'orge de résistance au feu\. / }),
      )
      await user.click(
        within(dialog).getByRole('button', { name: "Boisson : Vin d'orge de résistance au feu" }),
      )
      expect(dialog).toHaveAccessibleName('Ta boisson')
      await user.click(within(dialog).getByRole('button', { name: /^Retirer cette boisson/ }))
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear.carried).toEqual({
        trinket: 'TrinketIronHealth',
        power: 'GP_Bonemass',
        drinks: ['Potion_bzerker'],
        group: [],
      })
    })

    it('changes nothing of what you can take: what is carried is not on', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      const dialog = await openGear(user)

      expect(within(dialog).getByRole('region', { name: 'Ce que tu encaisses' })).toHaveTextContent(
        'Titube à 60 (40 % de 150 PV) · armure 45',
      )
    })

    it('says it in English too', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'en', gear: CARRYING })
      await openContext(user)
      await user.click(screen.getByRole('link', { name: /^Your gear:/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Your gear' })
      const section = within(dialog).getByRole('region', { name: 'What you carry' })

      expect(
        within(section).getByRole('button', { name: 'Trinket: Iron Brooch' }),
      ).toBeInTheDocument()
      expect(section).toHaveTextContent('30 s from 65 adrenaline · armor +20')
      expect(section).toHaveTextContent('blocking gives 5 stamina back')
    })
  })

  describe("the group's powers", () => {
    const GROUP = {
      ...WORN,
      carried: {
        trinket: 'TrinketIronHealth',
        power: 'GP_Bonemass',
        drinks: ['Potion_frostresist'],
        group: ['GP_Fader'],
      },
    }
    const group = (dialog: HTMLElement) => within(dialog).getByRole('region', { name: 'Du groupe' })

    it('lists them under what you carry, how long each lasts and what it changes', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'fr', gear: GROUP })
      const section = group(await openGear(user))

      expect(
        within(section).getByRole('button', { name: 'Pouvoir : Pouvoir de Fader' }),
      ).toBeInTheDocument()
      expect(section).toHaveTextContent('5 min · Feu ×0,5')
      expect(section).toHaveTextContent('tu titubes 2× moins vite')
      expect(section).toHaveTextContent(
        "Ce qu'un joueur lance près de toi ; à allumer comme les tiens. La Barrière magique dépend de la Magie du sang de qui la lance.",
      )
    })

    it('has only a way to add one at first', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const section = group(await openGear(user))

      expect(
        within(section)
          .getAllByRole('button')
          .map((button) => button.textContent),
      ).toEqual(['Ajouter un pouvoir du groupe', 'Ajouter une barrière magique'])
    })

    it('adds one neither yours nor added yet, swaps one, and takes one off', async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, { language: 'fr', gear: GROUP })
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'Ajouter un pouvoir du groupe' }))
      expect(dialog).toHaveAccessibleName('Un pouvoir du groupe')
      expect(dialog).toHaveTextContent(
        "Déjà là : Masse-d'Os (le tien) et Pouvoir de Fader. Un pouvoir ne compte qu'une fois.",
      )
      expect(within(dialog).queryByRole('button', { name: /^Masse-d'Os/ })).not.toBeInTheDocument()
      expect(
        within(dialog).queryByRole('button', { name: /^Pouvoir de Fader/ }),
      ).not.toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: /^Moder\. / }))

      expect(group(dialog)).toHaveTextContent('5 min · Glace ×0,5')
      await user.click(within(dialog).getByRole('button', { name: 'Pouvoir : Pouvoir de Fader' }))
      expect(dialog).toHaveAccessibleName('Pouvoir du groupe')
      expect(dialog).toHaveTextContent(
        'Choisis-en un autre pour remplacer le Pouvoir de Fader, ou retire-le.',
      )
      await user.click(within(dialog).getByRole('button', { name: /^Retirer ce pouvoir/ }))
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear.carried?.group).toEqual(['GP_Moder'])
    })

    it("tags them in your power's list, and takes one out of the group when it becomes yours", async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, { language: 'fr', gear: GROUP })
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: "Pouvoir : Masse-d'Os" }))
      expect(dialog).toHaveAccessibleName('Ton pouvoir')
      expect(within(dialog).getByRole('button', { name: /^Aucun pouvoir/ })).toHaveTextContent(
        'retire le tien',
      )
      expect(
        within(dialog).getByRole('button', { name: /^Masse-d'Os, équipé\. / }),
      ).toHaveTextContent('Équipé')
      await user.click(
        within(dialog).getByRole('button', { name: /^Pouvoir de Fader, du groupe\. / }),
      )

      expect(
        within(dialog).getByRole('button', { name: 'Pouvoir : Pouvoir de Fader' }),
      ).toBeInTheDocument()
      expect(within(group(dialog)).queryByRole('button', { name: /^Pouvoir : / })).toBeNull()
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear.carried).toMatchObject({ power: 'GP_Fader', group: [] })
    })

    it('says it in English too', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'en', gear: GROUP })
      await openContext(user)
      await user.click(screen.getByRole('link', { name: /^Your gear:/ }))
      const dialog = await screen.findByRole('dialog', { name: 'Your gear' })
      const section = within(dialog).getByRole('region', { name: 'From the group' })

      expect(within(section).getByRole('button', { name: 'Power: Fader' })).toBeInTheDocument()
      expect(section).toHaveTextContent(
        'What a player casts near you; switch it on like yours. The Magic barrier hangs on the Blood Magic of its caster.',
      )
      expect(within(section).getByRole('button', { name: 'Add a group power' })).toBeInTheDocument()
      expect(
        within(section).getByRole('button', { name: 'Add a Magic barrier' }),
      ).toBeInTheDocument()
    })
  })

  describe("the group's Magic barrier", () => {
    const group = (dialog: HTMLElement) => within(dialog).getByRole('region', { name: 'Du groupe' })
    const bloodMagic = (dialog: HTMLElement) =>
      within(dialog).getByRole('textbox', { name: 'Magie du sang de qui la lance' })

    it('adds the barrier a player casts, by their Blood Magic, kept once saved', async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(
        within(group(dialog)).getByRole('button', { name: 'Ajouter une barrière magique' }),
      )
      expect(dialog).toHaveAccessibleName('Barrière magique')
      expect(dialog).toHaveTextContent(
        'Le Bâton de protection la pose sur qui le lance et sur les joueurs à moins de 5 m, pour 1 à 4 min selon son niveau.',
      )
      expect(bloodMagic(dialog)).toHaveValue('0')
      expect(dialog).toHaveTextContent(/Elle absorbe\s*200/)
      expect(within(dialog).queryByRole('button', { name: 'Retirer la barrière' })).toBeNull()

      await user.click(within(dialog).getByRole('button', { name: 'Plus de Magie du sang' }))
      expect(dialog).toHaveTextContent(/Elle absorbe\s*205/)
      await user.clear(bloodMagic(dialog))
      await user.type(bloodMagic(dialog), '20')
      expect(dialog).toHaveTextContent(/Elle absorbe\s*300/)
      await user.click(within(dialog).getByRole('button', { name: 'Ajouter' }))

      expect(dialog).toHaveAccessibleName('Ton équipement')
      expect(
        within(group(dialog)).getByRole('button', {
          name: 'Barrière magique : Lancée avec Magie du sang 20',
        }),
      ).toBeInTheDocument()
      expect(group(dialog)).toHaveTextContent('1 à 4 min · absorbe 300')
      expect(
        within(group(dialog)).queryByRole('button', { name: 'Ajouter une barrière magique' }),
      ).toBeNull()
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear.carried?.barrier).toBe(20)
    })

    it('changes its Blood Magic, or takes it off', async () => {
      const user = userEvent.setup()
      const carried = { trinket: null, power: null, drinks: [], group: [], barrier: 20 }
      const { store } = renderWithStore(<App />, { language: 'fr', gear: { ...WORN, carried } })
      const dialog = await openGear(user)

      await user.click(within(group(dialog)).getByRole('button', { name: /^Barrière magique : / }))
      expect(bloodMagic(dialog)).toHaveValue('20')
      await user.click(within(dialog).getByRole('button', { name: 'Retirer la barrière' }))

      expect(dialog).toHaveAccessibleName('Ton équipement')
      expect(
        within(group(dialog)).getByRole('button', { name: 'Ajouter une barrière magique' }),
      ).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(store.getState().gear.carried?.barrier).toBeUndefined()
    })
  })

  describe('what is held', () => {
    it('starts bare-handed, without a level, under its own label', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'fr' })
      const dialog = await openGear(user)

      const held = within(dialog).getByRole('region', { name: 'En main' })
      expect(within(held).getByRole('button', { name: 'En main : Sans armes' })).toHaveTextContent(
        /^Sans armes$/,
      )
      expect(
        within(held).queryByRole('group', { name: /^En main : niveau/ }),
      ).not.toBeInTheDocument()
    })

    it('holds what is picked from bare hands at level 1, as its list says', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, {
        language: 'fr',
        gear: { ...MOCKUP_GEAR, blocker: 'PlayerUnarmed' },
      })
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'En main : Sans armes' }))
      expect(dialog).toHaveTextContent(
        'Au niveau 1, avec ta compétence Blocage 25 ; son niveau se règle ensuite.',
      )
      await user.click(within(dialog).getByRole('button', { name: /^Boucliers / }))
      await user.click(within(dialog).getByRole('button', { name: /^Bouclier en argent\. / }))

      expect(within(dialog).getByRole('group', { name: 'En main : niveau 1' })).toBeInTheDocument()
    })

    it('puts « Sans armes » at the head of the list, which puts down what you hold', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'En main : Bouclier en argent' }))
      const [first] = within(within(dialog).getByRole('list', { name: 'Boucliers' })).getAllByRole(
        'button',
      )
      expect(first).toHaveAccessibleName('Sans armes, lâche ce que tu tiens.')
      await user.click(first!)

      expect(
        within(dialog).getByRole('button', { name: 'En main : Sans armes' }),
      ).toBeInTheDocument()
      expect(
        within(dialog).queryByRole('group', { name: /^En main : niveau/ }),
      ).not.toBeInTheDocument()
    })
  })

  describe('its lists', () => {
    it('opens a row’s list in place of Your gear, titled by what it picks, and comes back unchanged', async () => {
      const user = userEvent.setup()
      const { store } = renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(
        within(dialog).getByRole('button', { name: 'Cape : Cape en fourrure de loup' }),
      )

      expect(dialog).toHaveAccessibleName('Ta cape')
      expect(dialog).toHaveTextContent('11 capes')
      expect(dialog).toHaveTextContent(
        'Au niveau 1 ; celle que tu choisis garde le niveau de ta cape (N3), à régler ensuite.',
      )
      const cards = within(within(dialog).getByRole('list', { name: 'Capes' })).getAllByRole(
        'button',
      )
      expect(cards[0]).toHaveAccessibleName('Aucune cape, retire celle que tu portes.')
      expect(cards[1]).toHaveAccessibleName('Cape en fourrure de loup, équipé. Choisir.')
      expect(within(dialog).queryByRole('button', { name: 'Valider' })).not.toBeInTheDocument()

      await user.click(
        within(dialog).getByRole('button', { name: 'Retour à Ton équipement, sans rien changer' }),
      )

      expect(dialog).toHaveAccessibleName('Ton équipement')
      expect(
        within(dialog).getByRole('button', { name: 'Cape : Cape en fourrure de loup' }),
      ).toBeInTheDocument()
      expect(store.getState().gear).toEqual(WORN)
    })

    it('opens a row’s list at its top, wherever Your gear was scrolled to', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)
      scroll(dialog, 300)

      await user.click(
        within(dialog).getByRole('button', { name: 'Cape : Cape en fourrure de loup' }),
      )

      expect(body(dialog).scrollTop).toBe(0)
    })

    it('comes back to Your gear where it was left, however far its list was scrolled', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)
      scroll(dialog, 300)
      await user.click(
        within(dialog).getByRole('button', { name: 'Cape : Cape en fourrure de loup' }),
      )
      scroll(dialog, 500)

      await user.click(within(dialog).getByRole('button', { name: /^Cape des cendres\. / }))

      expect(body(dialog).scrollTop).toBe(300)
    })

    it('keeps the level of the piece it replaces, within its own', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await pick(user, dialog, 'Cape', 'Cape des cendres')

      expect(within(dialog).getByRole('group', { name: 'Cape : niveau 3' })).toBeInTheDocument()
      expect(within(dialog).getByRole('region', { name: "Pièces d'armures" })).toHaveTextContent(
        '14 + 14 + 14 + 16',
      )
    })

    it('switches what is held between the shields, the weapons and the rest', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'En main : Bouclier en argent' }))

      expect(dialog).toHaveAccessibleName('Ce que tu tiens')
      expect(within(dialog).getByRole('button', { name: 'Boucliers 19' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      expect(within(dialog).queryByRole('button', { name: /^Aucun/ })).not.toBeInTheDocument()

      await user.click(within(dialog).getByRole('button', { name: /^Armes / }))

      expect(within(dialog).getByRole('list', { name: 'Armes' })).toBeInTheDocument()
    })

    it('searches the list, accents and case aside', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)
      await user.click(
        within(dialog).getByRole('button', { name: 'Cape : Cape en fourrure de loup' }),
      )

      await user.type(within(dialog).getByRole('searchbox', { name: 'Chercher une cape' }), 'LOUP')

      expect(
        within(within(dialog).getByRole('list', { name: 'Capes' })).getAllByRole('button'),
      ).toHaveLength(2)
    })

    it('carries a trinket in place of the one carried', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, {
        language: 'fr',
        gear: {
          ...WORN,
          carried: { trinket: 'TrinketIronHealth', power: null, drinks: [], group: [] },
        },
      })
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'Bibelot : Broche en fer' }))
      expect(dialog).toHaveTextContent('Un seul à la fois : celui que tu choisis remplace le tien.')
      await user.click(within(dialog).getByRole('button', { name: /^Voile d'ombre\. / }))

      expect(
        within(dialog).getByRole('button', { name: "Bibelot : Voile d'ombre" }),
      ).toBeInTheDocument()
    })
  })

  describe('on a desktop', () => {
    it('shows a list as the Arsenal’s table, « Choisir » on each row', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(
        within(dialog).getByRole('button', { name: 'Cape : Cape en fourrure de loup' }),
      )

      const table = within(dialog).getByRole('table', { name: 'Capes' })
      expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Aucune cape')
      expect(within(table).getByRole('button', { name: 'Retirer' })).toBeInTheDocument()

      await user.click(within(table).getByRole('button', { name: 'Choisir : Cape des cendres' }))

      expect(
        within(dialog).getByRole('button', { name: 'Cape : Cape des cendres' }),
      ).toBeInTheDocument()
    })

    it('changes nothing on Annuler', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      const { store } = renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await user.click(within(dialog).getByRole('button', { name: 'En main : niveau inférieur' }))
      await user.click(within(dialog).getByRole('button', { name: 'Annuler' }))

      expect(dialog).not.toBeInTheDocument()
      expect(store.getState().gear).toEqual(WORN)
    })

    it('updates the verdicts of the Bestiary once saved', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
      renderWithStore(<App />, fr)
      const dialog = await openGear(user)

      await pick(user, dialog, 'En main', 'Écu en bois')
      await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

      expect(screen.getByRole('group', { name: 'Ta parade' })).toHaveTextContent(
        'Ton objet ne pare pas',
      )
    })

    it('opens from the Simulation, where the thresholds are not', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/simulation/Troll/troll_groundslam')
      renderWithStore(<App />, fr)

      await user.click(screen.getByRole('link', { name: 'Tes seuils sont dans Ton équipement' }))

      expect(await screen.findByRole('dialog', { name: 'Ton équipement' })).toBeInTheDocument()
    })
  })
})
