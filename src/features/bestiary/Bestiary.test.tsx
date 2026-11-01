import { cleanup, isInaccessible, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from '@/app/App'
import type { Store } from '@/app/store'
import { MOCKUP_GEAR, MOCKUP_PIECES, openContext, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'

const list = () => screen.getByRole('list', { name: 'Créatures du biome' })
const row = (name: string) => within(list()).getByRole('link', { name: new RegExp(`^${name}`) })
const sheetHeading = (name: string) => screen.findByRole('heading', { level: 1, name })
/** Whether the advice `text` is the one read, not one kept unseen for the room of other stars. */
const read = (text: string) => !isInaccessible(screen.getByText(text))
const chips = (name: string) =>
  within(screen.getByRole('list', { name }))
    .getAllByRole('listitem')
    .map((item) => item.textContent)

/** Closes the app and opens it again at its bare address, as the installed app does on its start_url. */
function relaunch(store: Store) {
  cleanup()
  window.history.replaceState(null, '', '/')
  renderWithStore(<App />, {}, { store })
}

describe('Bestiary', () => {
  it('lists the creatures of the Meadows first, with their health and how to take them', () => {
    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Prairies')
    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent(
      'Biome 1 sur 9 · 8 créatures',
    )
    expect(row('Sanglier')).toHaveTextContent('10 PV')
    // A new character holds nothing: a boar staggers bare hands, a neck does not.
    expect(row('Sanglier')).toHaveTextContent('Esquive tout : même parées, ses attaques passent')
    expect(within(row('Nixe')).getByRole('img', { name: 'Blocage : tient' })).toBeInTheDocument()
    expect(row('Nixe')).toHaveTextContent('Tu bloques tout sans tituber')
    expect(row('Eikthyr')).toHaveTextContent('Boss · 500 PV')
  })

  it('says, where every parry holds, whether blocking staggers you or the block gives way', () => {
    window.history.replaceState(null, '', '#/bestiary/plains')
    renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

    expect(row('Lox')).toHaveTextContent('Pare-le : en bloquant, tu titubes')
    expect(row('Ours maudit')).toHaveTextContent('Pare-le : le blocage cède')
  })

  it('moves from biome to biome', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('button', { name: 'Biome suivant : Forêt noire' }))

    expect(await screen.findByText('Biome 2 sur 9 · 12 créatures')).toBeInTheDocument()
    expect(row('Troll')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bestiary/blackForest')
    expect(screen.getByRole('button', { name: 'Biome précédent : Prairies' })).toBeEnabled()
  })

  it('opens the sheet of a creature, in place of the bars on a phone, and comes back', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/blackForest')
    renderWithStore(<App />, { language: 'fr' })

    await user.click(row('Troll'))

    expect(await sheetHeading('Troll')).toBeInTheDocument()
    expect(document.title).toBe('Troll — Foelore')
    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getByText('Forêt noire')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Retour' }))

    expect(await screen.findByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bestiary/blackForest')
  })

  it('shows the creature at the stars picked', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })
    const punch = () => screen.getByRole('link', { name: /^Coup de poing,/ })

    expect(screen.getByRole('group', { name: 'Points de vie' })).toHaveTextContent('600')
    expect(punch()).toHaveTextContent('60')

    await user.click(screen.getByRole('button', { name: '1★' }))

    expect(screen.getByRole('button', { name: '1★' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Points de vie' })).toHaveTextContent('1 200')
    expect(punch()).toHaveTextContent('90')
  })

  it('holds the advice of every star in its place, the one picked alone read', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/mountain/Wolf')
    renderWithStore(<App />, { language: 'en', gear: MOCKUP_GEAR })

    expect(read('You block everything without staggering')).toBe(true)
    expect(read('Parry it: the block gives way')).toBe(false)

    await user.click(screen.getByRole('button', { name: '2★' }))

    expect(read('You block everything without staggering')).toBe(false)
    expect(read('Parry it: the block gives way')).toBe(true)
  })

  it('sums up the weaknesses and resistances, tools included, in the words of the game', () => {
    window.history.replaceState(null, '', '#/bestiary/mountain/StoneGolem')
    renderWithStore(<App />, { language: 'fr' })

    expect(chips('Faiblesses et résistances')).toEqual([
      'Pioche · Très faible ×2',
      'Coupant · Résistant ×0,5',
      'Perforant · Résistant ×0,5',
      'Feu · Immunisé ×0',
      'Glace · Immunisé ×0',
      'Poison · Immunisé ×0',
      'Esprit · Immunisé ×0',
    ])
    expect(screen.getByText('Tout le reste ×1')).toBeInTheDocument()
  })

  it('gives a weak spot its own row beside the body, by the name of the part', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })

    expect(chips('Faiblesses et résistances · Corps')).toEqual([
      'Perforant · Faible ×1,5',
      'Contondant · Résistant ×0,5',
      'Esprit · Immunisé ×0',
    ])
    expect(chips('Faiblesses et résistances · Tête')).toEqual([
      'Perforant · Très faible ×2',
      'Esprit · Immunisé ×0',
    ])
    expect(screen.getAllByText('Tout le reste ×1')).toHaveLength(2)
  })

  it('shows a tool taken normally without a word, the game having none', () => {
    window.history.replaceState(null, '', '#/bestiary/deepNorth/Barka')
    renderWithStore(<App />, { language: 'fr' })

    expect(chips('Faiblesses et résistances')).toContain('Couper ×1')
  })

  it('adds the trampling of a creature that runs into you, without a way to the Simulation', () => {
    window.history.replaceState(null, '', '#/bestiary/plains/Lox')
    renderWithStore(<App />, { language: 'fr' })

    expect(
      screen.getByText(/^Écrasement, contondant, 20 dégâts\. Blocage : \S.*\. Esquivable\.$/),
    ).toBeInTheDocument()
    expect(screen.getByText('En course', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^Écrasement/ })).not.toBeInTheDocument()
  })

  it('tells what the death of a creature deals, under its own heading', () => {
    window.history.replaceState(null, '', '#/bestiary/swamp/Writhan')
    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByText('À sa mort')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Explosion, contondant et poison, 100 dégâts. Blocage : imparable. Parade : imparable. Esquivable.',
      ),
    ).toBeInTheDocument()
  })

  it('opens the sheet of a creature a death brings, as many as the stars make', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/swamp/BlobElite')
    renderWithStore(<App />, { language: 'fr' })

    const blobs = screen.getByRole('link', { name: 'Blob ×2. Ouvrir la fiche Blob.' })
    expect(blobs).toHaveAttribute('href', '#/bestiary/swamp/Blob')

    await user.click(blobs)

    expect(await sheetHeading('Blob')).toBeInTheDocument()
  })

  it('puts what the end of a phase brings under that phase', () => {
    window.history.replaceState(null, '', '#/bestiary/deepNorth/FrozenKing')
    renderWithStore(<App />, { language: 'fr' })

    expect(screen.getByText('Fin de la phase')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Aspect du Cerf de l'orage ×1\./ })).toHaveAttribute(
      'href',
      '#/bestiary/deepNorth/Aspect_Eikthyr',
    )
  })

  it('gives each attack its damage types, its verdicts and a way to the Simulation', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'fr' })

    const slam = screen.getByRole('link', { name: /^Frappe au sol,/ })
    expect(slam).toHaveAccessibleName(
      /^Frappe au sol, contondant, 70 dégâts\. Blocage : \S.*\. Parade : \S.*\. Esquivable\. Ouvrir la simulation\.$/,
    )
    expect(slam).toHaveTextContent('Contondant')
    expect(slam).toHaveAttribute('href', '#/simulation/Troll/troll_groundslam')
  })

  it('tells when the item cannot parry', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, {
      language: 'fr',
      gear: { ...MOCKUP_GEAR, blocker: 'ShieldWoodTower', level: 1 },
    })

    expect(screen.getByRole('group', { name: 'Ta parade' })).toHaveTextContent(
      'Ton objet ne pare pas',
    )
  })

  it('says on the sheet that the block gives way, as the Simulation of the attack does', () => {
    window.history.replaceState(null, '', '#/bestiary/mountain/Dragon')
    renderWithStore(<App />, {
      language: 'fr',
      gear: { ...MOCKUP_GEAR, blocker: 'ShieldIronBuckler', skill: 16, armor: 49 },
    })

    expect(screen.getByText('Pare-le : le blocage cède')).toBeInTheDocument()
  })

  it('finds a creature or an attack in every biome, and opens its sheet', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'frappe',
    )

    const attacks = await screen.findByRole('region', { name: /^Attaques · \d+$/ })
    await user.click(within(attacks).getByRole('link', { name: /^Troll, Frappe au sol,/ }))

    expect(await sheetHeading('Troll')).toBeInTheDocument()
    expect(window.location.hash).toBe('#/bestiary/blackForest/Troll?q=frappe')
  })

  it('clears the search back to the biome', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })
    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'troll',
    )

    await user.click(await screen.findByRole('button', { name: 'Effacer la recherche' }))

    expect(await screen.findByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' })).toHaveValue(
      '',
    )
  })

  it('sets apart, by the biome they come from, the creatures a biome lists under one name', () => {
    window.history.replaceState(null, '', '#/bestiary/meadows')
    renderWithStore(<App />, { language: 'fr' })

    const skeletons = within(list()).getAllByRole('link', { name: /^Squelette/ })
    expect(skeletons).toHaveLength(2)
    expect(skeletons[0]).toHaveTextContent(/^Squelette · Prairies\s?30 PV/)
    expect(skeletons[1]).toHaveTextContent(/^Squelette\s?40 PV/)
  })

  it('names the sheet after the biome the creature comes from', async () => {
    window.history.replaceState(null, '', '#/bestiary/swamp/Skeleton_Swamps')
    renderWithStore(<App />, { language: 'fr' })

    expect(await sheetHeading('Squelette · Marécages')).toBeInTheDocument()
    expect(document.title).toBe('Squelette · Marécages — Foelore')
  })

  it('finds the creatures of one name apart', async () => {
    const user = userEvent.setup()
    renderWithStore(<App />, { language: 'fr' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'squelette',
    )

    const creatures = await screen.findByRole('region', { name: /^Créatures · \d+$/ })
    expect(within(creatures).getByRole('link', { name: /^Squelette · Montagne/ })).toHaveAttribute(
      'href',
      '#/bestiary/mountain/Skeleton_Mountains?q=squelette',
    )
  })

  it('speaks English, the names of the game included', () => {
    window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Troll' })).toBeInTheDocument()
    expect(screen.getByText('Black Forest')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Ground slam,/ })).toHaveTextContent('Blunt')
    expect(chips('Weaknesses and resistances · Body')[0]).toBe('Pierce · Weak ×1.5')
    expect(chips('Weaknesses and resistances · Head')[0]).toBe('Pierce · Very weak ×2')
  })

  it('sets namesakes apart in English too', () => {
    window.history.replaceState(null, '', '#/bestiary/swamp/Skeleton_Swamps')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByRole('heading', { level: 1, name: 'Skeleton · Swamp' })).toBeInTheDocument()
  })

  it('names trampling and death in English too', () => {
    window.history.replaceState(null, '', '#/bestiary/plains/Lox')
    renderWithStore(<App />, { language: 'en' })

    expect(screen.getByText(/^Trample, blunt, 20 damage\./)).toBeInTheDocument()
    expect(screen.getByText('When running', { exact: false })).toBeInTheDocument()
  })

  it('says whether blocking staggers you or the block gives way in English too', () => {
    window.history.replaceState(null, '', '#/bestiary/plains')
    renderWithStore(<App />, { language: 'en', gear: MOCKUP_GEAR })
    const creatures = within(screen.getByRole('list', { name: 'Creatures of the biome' }))

    expect(creatures.getByRole('link', { name: /^Lox/ })).toHaveTextContent(
      'Parry it: blocking staggers you',
    )
    expect(creatures.getByRole('link', { name: /^Vile/ })).toHaveTextContent(
      'Parry it: the block gives way',
    )
  })

  it('brings the tab back to the biome it was left on', async () => {
    const user = userEvent.setup()
    window.history.replaceState(null, '', '#/bestiary/swamp')
    renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('link', { name: 'Simulation' }))
    await screen.findByRole('heading', { level: 1, name: 'Simulation' })
    await user.click(screen.getByRole('link', { name: 'Bestiaire' }))

    await waitFor(() => {
      expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Marécages')
    })
  })

  it('opens again on the biome last picked, at the bare address of the app', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr' })

    await user.click(screen.getByRole('button', { name: 'Biome suivant : Forêt noire' }))
    await screen.findByText('Biome 2 sur 9 · 12 créatures')
    relaunch(store)

    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Forêt noire')
  })

  it('opens on the biome a link names, over the one last picked', () => {
    window.history.replaceState(null, '', '#/bestiary/mountain')
    renderWithStore(<App />, { language: 'fr', biome: 'swamp' })

    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Montagne')
  })

  it('keeps the biome last picked when the search opens a creature of another', async () => {
    const user = userEvent.setup()
    const { store } = renderWithStore(<App />, { language: 'fr', biome: 'swamp' })

    await user.type(
      screen.getByRole('searchbox', { name: 'Rechercher dans tous les biomes' }),
      'troll',
    )
    const creatures = await screen.findByRole('region', { name: /^Créatures · \d+$/ })
    await user.click(within(creatures).getByRole('link', { name: /^Troll/ }))
    await sheetHeading('Troll')
    relaunch(store)

    expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent('Marécages')
  })

  describe('with your temporary effects', () => {
    // The mockups' gear, carrying the Iron Brooch, Bonemass's power and the Frost Resistance Mead.
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

    it('folds a card on the sheet, which says that none is on at first', () => {
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })

      expect(card()).toHaveAttribute('aria-expanded', 'false')
      expect(card()).toHaveTextContent('Aucun allumé')
      expect(
        screen.queryByRole('group', { name: 'Tes effets temporaires' }),
      ).not.toBeInTheDocument()
    })

    it('unfolds what you carry, a switch each, and greys with its reason what changes nothing', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })

      await user.click(card())

      expect(card()).toHaveAttribute('aria-expanded', 'true')
      expect(effect('Broche en fer')).toHaveAttribute('aria-checked', 'false')
      expect(effect('Broche en fer')).toHaveAccessibleDescription(
        "Bibelot · 30 s dès 65 d'adrénaline",
      )
      expect(effect("Masse-d'Os")).toHaveAccessibleDescription('Pouvoir · 5 min')
      expect(
        within(effects()).queryByRole('switch', { name: 'Hydromel de résistance au gel' }),
      ).not.toBeInTheDocument()
      expect(effects()).toHaveTextContent(
        'Hydromel de résistance au gelBoisson · 10 minNe change rien : pas de glace',
      )
      expect(effects()).toHaveTextContent("Vaut jusqu'à ce que tu changes de créature.")
    })

    it('greys without a switch a power that changes no hit', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      const carried = { ...CARRYING.carried, power: 'GP_Eikthyr' }
      renderWithStore(<App />, { language: 'fr', gear: { ...CARRYING, carried } })

      await user.click(card())

      expect(within(effects()).queryByRole('switch', { name: 'Eikthyr' })).not.toBeInTheDocument()
      expect(effects()).toHaveTextContent('EikthyrPouvoir · 5 minNe change aucun coup')
    })

    it('counts at once what is switched on: the Lox, parried, is then blocked whole', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      expect(read('Pare-le : en bloquant, tu titubes')).toBe(true)

      await user.click(card())
      await user.click(effect('Broche en fer'))
      await user.click(effect("Masse-d'Os"))

      expect(effect('Broche en fer')).toHaveAttribute('aria-checked', 'true')
      expect(card()).toHaveTextContent("Broche en fer et Masse-d'Os")
      expect(read('Tu bloques tout sans tituber')).toBe(true)

      await user.click(effect('Broche en fer'))

      expect(card()).toHaveTextContent("Masse-d'Os")
      expect(read('Pare-le : en bloquant, tu titubes')).toBe(true)
    })

    it("switches the group's Magic barrier on, and each attack says how many such hits it takes", async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      const carried = { ...CARRYING.carried, barrier: 20 }
      renderWithStore(<App />, { language: 'fr', gear: { ...CARRYING, carried } })

      await user.click(card())
      expect(effects()).toHaveTextContent('Du groupe · absorbe 300 · 1 à 4 min')
      await user.click(effect('Barrière magique'))

      expect(card()).toHaveTextContent('Barrière magique')
      expect(screen.getByRole('link', { name: /^Morsure,/ })).toHaveTextContent(
        'Barrière : 3 coups',
      )
      expect(screen.getByRole('link', { name: /^Piétinement,/ })).toHaveTextContent(
        'Barrière : 1 coup (compte 320)',
      )
      // The verdicts are those once it breaks.
      expect(read('Pare-le : en bloquant, tu titubes')).toBe(true)
    })

    it('has a card for the barrier alone, when nothing else is carried', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      const carried = { trinket: null, power: null, drinks: [], group: [], barrier: 0 }
      renderWithStore(<App />, { language: 'fr', gear: { ...CARRYING, carried } })

      await user.click(card())

      expect(effects()).toHaveTextContent('Du groupe · absorbe 200 · 1 à 4 min')
      expect(effect('Barrière magique')).not.toBeChecked()
    })

    it("lists the group's powers after the drinks, and counts them: Fader's has the Lox blocked whole", async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      const carried = { ...CARRYING.carried, group: ['GP_Fader', 'GP_Moder'] }
      renderWithStore(<App />, { language: 'fr', gear: { ...CARRYING, carried } })

      await user.click(card())

      expect(effect('Pouvoir de Fader')).toHaveAccessibleDescription('Pouvoir du groupe · 5 min')
      expect(effects()).toHaveTextContent(
        /Hydromel de résistance au gel.*Pouvoir de Fader.*ModerPouvoir du groupe · 5 minNe change rien : pas de glace/,
      )
      await user.click(effect('Pouvoir de Fader'))

      expect(card()).toHaveTextContent('Pouvoir de Fader')
      expect(read('Tu bloques tout sans tituber')).toBe(true)
    })

    it("says what already covers what a row would: the group's power by its name, your cape", async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/GoblinShaman')
      const carried = { ...CARRYING.carried, drinks: ['Potion_barleywine'], group: ['GP_Fader'] }
      const { unmount } = renderWithStore(<App />, {
        language: 'fr',
        gear: { ...CARRYING, carried },
      })
      await user.click(card())
      await user.click(effect('Pouvoir de Fader'))

      expect(effects()).toHaveTextContent(
        "Vin d'orge de résistance au feuBoisson · 10 minNe change rien : déjà couvert par le Pouvoir de Fader",
      )
      unmount()

      window.history.replaceState(null, '', '#/bestiary/mountain/Dragon')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      await user.click(card())

      expect(effects()).toHaveTextContent(
        'Hydromel de résistance au gelBoisson · 10 minNe change rien : déjà couvert par ta cape',
      )
    })

    it('holds in the Simulation of its attacks, until another creature', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })
      await user.click(card())
      await user.click(effect("Masse-d'Os"))

      await user.click(screen.getByRole('link', { name: /^Morsure,/ }))

      expect(
        await screen.findByRole('button', { name: /^Avec tes effets temporaires/ }),
      ).toHaveTextContent("Masse-d'Os")

      window.location.hash = '#/bestiary/plains/Deathsquito'
      expect(await sheetHeading('Morstique')).toBeInTheDocument()
      expect(card()).toHaveTextContent('Aucun allumé')

      window.location.hash = '#/bestiary/plains/Lox'
      expect(await sheetHeading('Lox')).toBeInTheDocument()
      expect(card()).toHaveTextContent('Aucun allumé')
    })

    it('shows no card to a player who carries nothing', () => {
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })

      expect(
        screen.queryByRole('button', { name: /^Avec tes effets temporaires/ }),
      ).not.toBeInTheDocument()
    })

    it('keeps the list without them, beside the sheet on a desktop', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr', gear: CARRYING })

      await user.click(card())
      await user.click(effect('Broche en fer'))
      await user.click(effect("Masse-d'Os"))

      expect(screen.getByText('Sans tes effets temporaires')).toBeInTheDocument()
      expect(row('Lox')).toHaveTextContent('Pare-le : en bloquant, tu titubes')
      expect(screen.getByRole('group', { name: 'Comment le prendre' })).toHaveTextContent(
        'Tu bloques tout sans tituber',
      )
    })

    it('speaks English too', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'en', gear: CARRYING })

      await user.click(screen.getByRole('button', { name: /^With your temporary effects/ }))

      const group = screen.getByRole('group', { name: 'Your temporary effects' })
      expect(
        within(group).getByRole('switch', { name: 'Iron Brooch' }),
      ).toHaveAccessibleDescription('Trinket · 30 s from 65 adrenaline')
      expect(group).toHaveTextContent('Changes nothing: no frost')
      expect(group).toHaveTextContent('Holds until you change creature.')
    })
  })

  describe('in the rain', () => {
    // A Wood shield level 1, no skill, rags, 45 HP: where Wet's lightning weakness makes Eikthyr's blocked
    // Charge and Stomp stagger.
    const EARLY = {
      blocker: 'ShieldWood',
      level: 1,
      skill: 0,
      armor: 0,
      maxHealth: 45,
      pieces: {
        chest: { id: 'ArmorRagsChest', level: 1 },
        legs: { id: 'ArmorRagsLegs', level: 1 },
      },
    }
    const wet = () => screen.getByRole('switch', { name: 'Humide' })

    it('switches Wet on in your setup, for every creature of the biome', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'fr', gear: EARLY })
      expect(row('Eikthyr')).toHaveTextContent('Esquive « Coup de bois », bloque le reste')

      await openContext(user)
      expect(wet()).not.toBeChecked()
      expect(screen.getByRole('dialog', { name: 'Ton contexte' })).toHaveTextContent(
        'Feu ×0,5 · Glace et Foudre ×1,5',
      )
      await user.click(wet())

      expect(wet()).toBeChecked()
      expect(row('Eikthyr')).toHaveTextContent('Esquive « Coup de bois », pare le reste')
      expect(screen.getByRole('group', { name: 'Biome' })).toHaveTextContent(
        'Biome 1 sur 9 · 8 créatures · Humide',
      )
      expect(
        screen.getByRole('button', { name: /^Ton contexte : .*, humide$/ }),
      ).toBeInTheDocument()
    })

    it('offers no Wet where it never rains', async () => {
      const user = userEvent.setup()
      window.history.replaceState(null, '', '#/bestiary/mountain')
      renderWithStore(<App />, { language: 'fr', gear: EARLY })

      await openContext(user)

      expect(screen.queryByRole('switch', { name: 'Humide' })).not.toBeInTheDocument()
    })

    it('dries off as another biome is shown', async () => {
      const user = userEvent.setup()
      renderWithStore(<App />, { language: 'fr', gear: EARLY })
      await openContext(user)
      await user.click(wet())
      await user.click(screen.getByRole('button', { name: 'Biome suivant : Forêt noire' }))

      expect(await screen.findByText('Biome 2 sur 9 · 12 créatures')).toBeInTheDocument()
      expect(wet()).not.toBeChecked()
    })

    it('reads beside the biome of the sheet, and in the sidebar on a desktop', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/meadows/Eikthyr')
      renderWithStore(<App />, { language: 'en', gear: EARLY })

      await user.click(screen.getByRole('switch', { name: 'Wet' }))

      expect(screen.getByRole('region', { name: 'Eikthyr' })).toHaveTextContent('Meadows · Wet')
      expect(
        within(screen.getByRole('region', { name: 'Eikthyr' })).getByText(
          'Dodge “Antler”, parry the rest',
        ),
      ).toBeInTheDocument()
    })
  })

  describe('on a desktop', () => {
    it('shows the list and the sheet side by side, the first creature to begin with', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/blackForest')
      renderWithStore(<App />, { language: 'fr' })

      expect(screen.getByRole('heading', { level: 1, name: 'Bestiaire' })).toBeInTheDocument()
      expect(
        screen.getByRole('heading', { level: 2, name: 'Squelette · Prairies' }),
      ).toBeInTheDocument()

      await user.click(row('Troll'))

      expect(await screen.findByRole('heading', { level: 2, name: 'Troll' })).toBeInTheDocument()
      expect(row('Troll')).toHaveAttribute('aria-current', 'true')
      expect(screen.getByRole('list', { name: 'Créatures du biome' })).toBeInTheDocument()
    })

    it('holds the advice of every star in its card, the one picked alone read', async () => {
      const user = userEvent.setup()
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/mountain/Wolf')
      renderWithStore(<App />, { language: 'fr', gear: MOCKUP_GEAR })
      const card = () => screen.getByRole('group', { name: 'Comment le prendre' })
      const readInCard = (text: string) => !isInaccessible(within(card()).getByText(text))

      expect(readInCard('Tu bloques tout sans tituber')).toBe(true)
      expect(readInCard('Pare-le : le blocage cède')).toBe(false)

      await user.click(screen.getByRole('button', { name: '2★' }))

      expect(readInCard('Tu bloques tout sans tituber')).toBe(false)
      expect(readInCard('Pare-le : le blocage cède')).toBe(true)
    })

    it('puts what a death brings in the table, with a way to its sheet', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/swamp/BlobElite')
      renderWithStore(<App />, { language: 'fr' })

      const table = screen.getByRole('table', { name: 'Ses attaques' })
      expect(within(table).getByRole('columnheader', { name: 'À sa mort' })).toBeInTheDocument()
      expect(
        within(table).getByRole('link', { name: 'Blob ×2. Ouvrir la fiche Blob.' }),
      ).toHaveTextContent('Sa fiche')
    })

    it('keeps the range of an attack in its cell too, for a desktop narrower than the table', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/blackForest/Troll')
      renderWithStore(<App />, { language: 'fr' })

      expect(screen.getByRole('rowheader', { name: /^Coup de poing/ })).toHaveTextContent('4 m')
    })

    it('keeps the range of trampling in its cell too', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr' })

      expect(screen.getByRole('rowheader', { name: /^Écrasement/ })).toHaveTextContent('En course')
    })

    it('gives trampling its range, when running', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/plains/Lox')
      renderWithStore(<App />, { language: 'fr' })

      const trample = screen.getByRole('row', { name: /^Écrasement/ })
      expect(trample).toHaveTextContent('En course')
      expect(within(trample).queryByRole('link')).not.toBeInTheDocument()
    })

    it('gives the death blast its radius', () => {
      setViewportWidth('desktop')
      window.history.replaceState(null, '', '#/bestiary/swamp/Writhan')
      renderWithStore(<App />, { language: 'fr' })

      const rows = screen.getAllByRole('row', { name: /^Explosion/ })
      expect(rows).toHaveLength(2)
      expect(rows[1]).toHaveTextContent('6 m')
      expect(within(rows[1]!).queryByRole('link')).not.toBeInTheDocument()
    })
  })
})
