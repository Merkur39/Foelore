import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import { MOCKUP_GEAR, MOCKUP_PIECES, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

// The mockups' gear: the silver shield, iron and the wolf cape, carrying the Iron Brooch, Bonemass's
// power and the Frost Resistance Mead, with Fader's power from the group.
const GEAR = {
  ...MOCKUP_GEAR,
  armor: 0,
  pieces: MOCKUP_PIECES,
  carried: {
    trinket: 'TrinketIronHealth',
    power: 'GP_Bonemass',
    drinks: ['Potion_frostresist'],
    group: ['GP_Fader'],
  },
}
const fr = { language: 'fr', gear: GEAR } as const
const list = (name: string) => within(screen.getByRole('list', { name })).getAllByRole('link')
const press = (group: string, name: string) =>
  within(screen.getByRole('group', { name: group })).getByRole('button', { name })

describe('Arsenal', () => {
  it('lists the shields at level 1 and your skill, the one you hold first, with no level to pick', () => {
    window.history.replaceState(null, '', '#/arsenal')

    renderWithStore(<App />, fr)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Arsenal')
    const [held] = list('Boucliers')
    expect(held).toHaveAccessibleName(/^Bouclier en argent, équipé\./)
    expect(held).toHaveTextContent('67,5')
    expect(held).toHaveTextContent('101,25')
    expect(held).not.toHaveTextContent('%')
    expect(screen.queryByRole('group', { name: "Niveau d'amélioration" })).not.toBeInTheDocument()
  })

  it('reaches every category by its family, the first of a family to begin with', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    renderWithStore(<App />, fr)

    await user.click(press('Famille', 'Armures'))

    expect(window.location.hash).toBe('#/arsenal/helmets')
    expect(press('Catégorie', 'Casques')).toHaveAttribute('aria-pressed', 'true')

    await user.click(press('Catégorie', 'Capes'))

    const [worn] = list('Capes')
    expect(worn).toHaveAccessibleName(/^Cape en fourrure de loup, équipé\./)
    expect(worn).toHaveTextContent('Armure1')
    expect(worn).toHaveTextContent('Par niveau+1')
    expect(
      within(worn!).getByRole('list', { name: 'Résistances et faiblesses' }),
    ).toHaveTextContent('Glace · Résistant ×0,5')
  })

  it('names the set of a piece whose bonus changes a fight', () => {
    window.history.replaceState(null, '', '#/arsenal/helmets')
    renderWithStore(<App />, fr)

    expect(screen.getByRole('link', { name: /^Capuche de Fenris\./ })).toHaveTextContent(
      'Ensemble Bénédiction de Fenris, 3 pièces : Feu ×0,5',
    )
  })

  it("lists what one carries, yours first then the group's, how long it lasts and what it changes", async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    renderWithStore(<App />, fr)

    await user.click(press('Famille', 'À emporter'))

    expect(window.location.hash).toBe('#/arsenal/powers')
    const powers = list('Pouvoirs')
    expect(powers.map((power) => power.getAttribute('aria-label'))).toEqual([
      "Masse-d'Os, équipé. Ouvrir dans Ton équipement.",
      'Pouvoir de Fader, du groupe. Ouvrir dans Ton équipement.',
      'Eikthyr. Ouvrir dans Ton équipement.',
      "L'Aîné. Ouvrir dans Ton équipement.",
      'Moder. Ouvrir dans Ton équipement.',
      'Yagluth. Ouvrir dans Ton équipement.',
      'La Reine. Ouvrir dans Ton équipement.',
    ])
    expect(powers[0]).toHaveTextContent('Équipé')
    expect(powers[1]).toHaveTextContent('Du groupe')
    expect(powers[0]).toHaveTextContent('5 min · recharge 20 min')
    expect(powers[0]).toHaveTextContent('Contondant, Coupant et Perforant ×0,75')
    expect(powers[0]).toHaveTextContent("Bloquer rend 5 d'endurance")
    expect(powers[2]).toHaveTextContent('5 min · recharge 20 min')
    expect(powers[2]).toHaveTextContent('Ne change aucun coup')
    expect(powers[1]).toHaveTextContent('Tu titubes 2× moins vite')
  })

  it('opens Your gear with the item picked, at the level of the one it replaces', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    const { store } = renderWithStore(<App />, fr)

    await user.click(screen.getByRole('link', { name: /^Bouclier en sombracier\./ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })

    expect(
      within(dialog).getByRole('button', { name: 'En main : Bouclier en sombracier' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('group', { name: 'En main : niveau 3' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(store.getState().gear).toEqual({ ...GEAR, blocker: 'ShieldBlackmetal' })
    expect(window.location.hash).toBe('#/arsenal')
  })

  it('opens Your gear with the piece picked, worn in its slot', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal/capes')
    const { store } = renderWithStore(<App />, fr)

    await user.click(screen.getByRole('link', { name: /^Cape en tissu\./ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(store.getState().gear.pieces).toEqual({
      ...MOCKUP_PIECES,
      cape: { id: 'CapeLinen', level: 3 },
    })
  })

  it('opens Your gear with the drink picked, carried beside the others', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal/drinks')
    const { store } = renderWithStore(<App />, fr)

    await user.click(screen.getByRole('link', { name: /^Hydromel des berserkir\./ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })
    await user.click(within(dialog).getByRole('button', { name: 'Valider' }))

    expect(store.getState().gear.carried?.drinks).toEqual(['Potion_frostresist', 'Potion_bzerker'])
  })

  it('leaves your gear alone when Your gear is closed without saving', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal/trinkets')
    const { store } = renderWithStore(<App />, fr)

    await user.click(screen.getByRole('link', { name: /^Voile d'ombre\./ }))
    const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })
    await user.click(within(dialog).getByRole('button', { name: 'Fermer sans enregistrer' }))

    expect(store.getState().gear).toEqual(GEAR)
  })

  it('searches every category at once, three of each, then the way to all of them', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal')
    renderWithStore(<App />, fr)

    await user.type(
      screen.getByRole('searchbox', { name: "Rechercher dans tout l'Arsenal" }),
      'FER',
    )

    expect(screen.getByText('12 résultats dans 6 catégories')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Famille' })).not.toBeInTheDocument()
    const weapons = screen.getByRole('region', { name: /^Armes · 6/ })
    expect(
      within(weapons).getAllByRole('link', { name: /Ouvrir dans Ton équipement/ }),
    ).toHaveLength(3)
    expect(screen.getByRole('link', { name: /^Broche en fer, emporté\./ })).toBeInTheDocument()

    await user.click(within(weapons).getByRole('link', { name: 'Voir les 6 armes' }))

    expect(window.location.hash).toBe('#/arsenal/weapons')
    expect(list('Armes').length).toBeGreaterThan(6)
  })

  it('says when the search finds nothing, and clears it', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal/capes?q=zzz')
    renderWithStore(<App />, fr)

    expect(screen.getByText('Rien pour « zzz »')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Effacer la recherche' }))

    expect(list('Capes')[0]).toHaveAccessibleName(/^Cape en fourrure de loup/)
  })

  it('speaks English, the names of the game included', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/arsenal/trinkets')
    renderWithStore(<App />, { ...fr, language: 'en' })

    const [brooch] = list('Trinkets')
    expect(brooch).toHaveAccessibleName('Iron Brooch, carried. Open in Your gear.')
    expect(brooch).toHaveTextContent('30 s · from 65 adrenaline')
    expect(brooch).toHaveTextContent('Armor +20')

    await user.click(press('Family', 'In hand'))

    expect(list('Shields')[0]).toHaveAccessibleName(/^Silver Shield, equipped\./)
  })

  describe('on a desktop', () => {
    it('lists the categories beside the page, each with its count', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/arsenal/legs')
      renderWithStore(<App />, fr)

      const nav = screen.getByRole('navigation', { name: "Catégories de l'Arsenal" })
      const armor = within(nav).getByRole('group', { name: "Pièces d'armures" })
      expect(within(armor).getByRole('link', { name: /^Jambières/ })).toHaveAttribute(
        'aria-current',
        'true',
      )
      expect(within(nav).getByRole('link', { name: /^Pouvoirs/ })).toHaveTextContent('Pouvoirs7')
      expect(screen.getByText(/^Au niveau 1 ; touche-en une/)).toBeInTheDocument()
    })

    it('shows what blocks in a table, sorted as asked', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/arsenal')
      renderWithStore(<App />, fr)

      const table = screen.getByRole('table', { name: 'Boucliers' })
      expect(within(table).getByRole('columnheader', { name: 'VD' })).toHaveAttribute(
        'aria-sort',
        'descending',
      )
      expect(screen.getByText(/^Au niveau 1, avec ta compétence Blocage/)).toHaveTextContent(
        'Blocage 25 ;',
      )

      await user.selectOptions(screen.getByRole('combobox', { name: 'Trier par' }), ['En parade'])

      expect(within(table).getByRole('columnheader', { name: 'En parade' })).toHaveAttribute(
        'aria-sort',
        'descending',
      )
      expect(within(table).getAllByRole('row')[1]).toHaveTextContent('Équipé')
    })

    it('shows the pieces and the effects in tables of their own, each with its action', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/arsenal/chests')
      renderWithStore(<App />, fr)

      const chests = screen.getByRole('table', { name: 'Plastrons' })
      expect(
        within(chests)
          .getAllByRole('columnheader')
          .map((header) => header.textContent),
      ).toEqual([
        'Plastron',
        'Armure ↓',
        'Par niveau',
        'Résistances et faiblesses',
        'Ensemble',
        'Action',
      ])
      expect(within(chests).getAllByRole('row')[1]).toHaveTextContent('Équipé')

      await user.click(screen.getByRole('link', { name: /^Pouvoirs/ }))

      const powers = screen.getByRole('table', { name: 'Pouvoirs' })
      expect(within(powers).getByRole('columnheader', { name: 'Recharge' })).toBeInTheDocument()
      expect(within(powers).getAllByRole('row')[1]).toHaveTextContent('Équipé')
      expect(within(powers).getAllByRole('row')[2]).toHaveTextContent('Du groupe')
      expect(
        within(powers).getByRole('link', { name: 'Équiper : Pouvoir de Fader' }),
      ).toBeInTheDocument()

      await user.click(within(powers).getByRole('link', { name: 'Équiper : Moder' }))

      const dialog = await screen.findByRole('dialog', { name: 'Ton équipement' })
      expect(within(dialog).getByRole('button', { name: 'Pouvoir : Moder' })).toBeInTheDocument()
    })

    it('shows what the search finds in each category, the counts beside', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/arsenal')
      renderWithStore(<App />, fr)

      await user.type(
        screen.getByRole('searchbox', { name: "Rechercher dans tout l'Arsenal" }),
        'fer',
      )

      expect(
        screen.getByText(/^12 résultats pour « fer », dans 6 catégories\./),
      ).toBeInTheDocument()
      expect(screen.getByRole('table', { name: 'Armes' })).toBeInTheDocument()
      expect(screen.getByRole('table', { name: 'Bibelots' })).toBeInTheDocument()
      const nav = screen.getByRole('navigation', { name: "Catégories de l'Arsenal" })
      expect(within(nav).getByRole('link', { name: /^Armes/ })).toHaveTextContent('Armes6')
      expect(within(nav).getByRole('link', { name: /^Capes/ })).toHaveTextContent('Capes0')
    })
  })
})
