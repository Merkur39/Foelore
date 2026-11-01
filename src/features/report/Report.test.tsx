import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { App } from '@/app/App'
import type { Gear } from '@/app/store'
import { MOCKUP_GEAR, MOCKUP_PIECES, renderWithStore } from '../../../test/utils'
import { setViewportWidth } from '../../../test/viewport'
import type { Report } from './model'
import { createOutbox, SendError, type Sender } from './outbox'

const sheet = () => screen.getByRole('dialog', { name: 'Signaler' })
const inSheet = () => within(sheet())
const send = () => inSheet().getByRole('button', { name: 'Envoyer' })
const sentReport = (sender: ReturnType<typeof vi.fn<Sender>>): Report | undefined =>
  sender.mock.calls[0]?.[0]

function renderApp(hash: string, sender: Sender, gear: Gear = MOCKUP_GEAR) {
  window.history.replaceState(null, '', hash)
  const outbox = createOutbox(null, sender)
  renderWithStore(<App />, { language: 'fr', gear }, { outbox })
  return outbox
}

async function write(user: UserEvent, label: string | RegExp, text: string) {
  await user.type(inSheet().getByRole('textbox', { name: label }), text)
}

describe('Reporting', () => {
  it('reports a wrong number from a creature sheet, the line picked, and gives the issue its number', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 48 })
    renderApp('#/bestiary/blackForest/Troll', sender)

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    expect(inSheet().getByRole('button', { name: 'Donnée fausse' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    const lines = inSheet().getByRole('group', { name: 'Quelle ligne ?' })
    await user.click(within(lines).getByRole('button', { name: 'Frappe au sol' }))
    await write(user, "Qu'est-ce qui est faux ?", 'Elle fait 60 dans le jeu.')
    await write(user, /^Ce que montre le jeu/, '60')
    await user.click(send())

    expect(await inSheet().findByText(/^Reçu, c'est le/)).toHaveTextContent("Reçu, c'est le #48")
    expect(sentReport(sender)).toMatchObject({
      kind: 'data',
      text: 'Elle fait 60 dans le jeu.',
      game: '60',
      subject: expect.stringMatching(/^Troll › /) as unknown,
      line: { label: 'Frappe au sol' },
      context: { screen: 'creature', creature: 'Troll', language: 'fr', width: 390 },
    })
  })

  it('shows what goes with a report before it leaves, and nothing that tells who sent it', async () => {
    const user = userEvent.setup()
    renderApp('#/bestiary/blackForest/Troll', vi.fn<Sender>())

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    await user.click(inSheet().getByText('Joint au signalement'))

    const attached = inSheet().getByRole('group', { name: 'Joint au signalement' })
    expect(attached).toHaveTextContent(`Foelore ${__APP_VERSION__}`)
    expect(attached).toHaveTextContent('Bouclier en argent')
    expect(attached).toHaveTextContent('Frappe au sol')
    expect(attached).toHaveTextContent("Rien d'autre : ni adresse IP, ni identifiant.")
    expect(sheet()).toHaveTextContent(
      'Ton signalement devient public sur GitHub, avec ton pseudo si tu en donnes un.',
    )
  })

  it('waits for some words before sending', async () => {
    const user = userEvent.setup()
    renderApp('#/bestiary/blackForest/Troll', vi.fn<Sender>())

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    expect(send()).toBeDisabled()
    await write(user, "Qu'est-ce qui est faux ?", ' ')
    expect(send()).toBeDisabled()
    await write(user, "Qu'est-ce qui est faux ?", 'Le nom')
    expect(send()).toBeEnabled()
  })

  it('keeps a report that cannot leave, and says so', async () => {
    const user = userEvent.setup()
    const outbox = renderApp(
      '#/bestiary/blackForest/Troll',
      vi.fn<Sender>().mockRejectedValue(new SendError(null)),
    )

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    await write(user, "Qu'est-ce qui est faux ?", 'Le nom')
    await user.click(send())

    expect(await inSheet().findByText('Gardé sur ton appareil')).toBeInTheDocument()
    expect(outbox.pending()).toHaveLength(1)
  })

  it('says so when the server refuses a report, and points to GitHub', async () => {
    const user = userEvent.setup()
    renderApp('#/bestiary/blackForest/Troll', vi.fn<Sender>().mockRejectedValue(new SendError(422)))

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    await write(user, "Qu'est-ce qui est faux ?", 'Le nom')
    await user.click(send())

    expect(await inSheet().findByText('Refusé par le serveur')).toBeInTheDocument()
    expect(inSheet().getByRole('link', { name: /^Ouvrir un ticket sur GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/Merkur39/Foelore/issues/new/choose',
    )
  })

  it('reports a verdict from the Simulation, the attack and the setup attached', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 49 })
    renderApp('#/simulation/Troll/troll_groundslam', sender)

    await user.click(screen.getByRole('button', { name: 'Ce verdict te paraît faux ? Signale-le' }))
    expect(inSheet().queryByRole('group', { name: 'Quelle ligne ?' })).not.toBeInTheDocument()
    await write(user, "Qu'est-ce qui est faux ?", 'Je ne titube pas en jeu.')
    await user.click(send())

    await inSheet().findByText(/^Reçu, c'est le/)
    const report = sentReport(sender)
    expect(report).toMatchObject({
      kind: 'data',
      subject: expect.stringMatching(/^Troll › /) as unknown,
      context: { screen: 'simulation', creature: 'Troll', attack: 'troll_groundslam' },
    })
    expect(report?.context.shows.join('\n')).toMatch(/Bouclier en argent/)
  })

  it('attaches the armor, the max health and the pieces worn, or says the armor was typed', async () => {
    const shows = async (gear: Gear) => {
      const user = userEvent.setup()
      const sender = vi.fn<Sender>().mockResolvedValue({ number: 50 })
      renderApp('#/simulation/Troll/troll_groundslam', sender, gear)
      await user.click(
        screen.getByRole('button', { name: 'Ce verdict te paraît faux ? Signale-le' }),
      )
      await write(user, "Qu'est-ce qui est faux ?", 'Je ne titube pas en jeu.')
      await user.click(send())
      await inSheet().findByText(/^Reçu, c'est le/)
      return sentReport(sender)?.context.shows ?? []
    }

    expect(await shows({ ...MOCKUP_GEAR, armor: 0, pieces: MOCKUP_PIECES })).toContain(
      "Armure 45 · 150 PV max : Casque en fer N1, Armure d'écailles de fer N1, Jambières en plaques de fer N1, Cape en fourrure de loup N3",
    )
    cleanup()
    expect(await shows(MOCKUP_GEAR)).toContain('Armure 45, tapée · 150 PV max')
  })

  it('attaches the effects switched on, from the sheet as from the Simulation', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 51 })
    renderApp('#/bestiary/plains/Lox', sender, {
      ...MOCKUP_GEAR,
      armor: 0,
      pieces: MOCKUP_PIECES,
      carried: { trinket: 'TrinketIronHealth', power: 'GP_Bonemass', drinks: [], group: [] },
    })
    await user.click(screen.getByRole('button', { name: /^Avec tes effets temporaires/ }))
    const effects = screen.getByRole('group', { name: 'Tes effets temporaires' })
    await user.click(within(effects).getByRole('switch', { name: 'Broche en fer' }))
    await user.click(within(effects).getByRole('switch', { name: "Masse-d'Os" }))

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    await write(user, "Qu'est-ce qui est faux ?", 'La Broche ne compte pas.')
    await user.click(send())

    await inSheet().findByText(/^Reçu, c'est le/)
    expect(sentReport(sender)?.context.shows).toContain(
      "Effets temporaires allumés : Broche en fer et Masse-d'Os",
    )
  })

  it('reports a bug or an idea from Settings, its kind picked first', async () => {
    const user = userEvent.setup()
    const sender = vi.fn<Sender>().mockResolvedValue({ number: 50 })
    renderApp('#/bestiary?modal=settings', sender)

    await user.click(screen.getByRole('button', { name: 'Signaler un problème ou une idée' }))

    expect(screen.queryByRole('dialog', { name: 'Réglages' })).not.toBeInTheDocument()
    for (const kind of ['Donnée fausse', 'Bug', 'Idée']) {
      expect(inSheet().getByRole('button', { name: kind })).toHaveAttribute('aria-pressed', 'false')
    }
    await user.click(inSheet().getByRole('button', { name: 'Idée' }))
    await write(user, 'Ton idée', 'Les boss phase par phase.')
    expect(
      inSheet().queryByRole('textbox', { name: /^Ce que montre le jeu/ }),
    ).not.toBeInTheDocument()
    await write(user, /^Ton pseudo/, 'Ragnar')
    await user.click(send())

    await inSheet().findByText(/^Reçu, c'est le/)
    expect(sentReport(sender)).toMatchObject({
      kind: 'idea',
      nickname: 'Ragnar',
      context: { screen: 'settings' },
    })
    expect(sentReport(sender)).not.toHaveProperty('subject')
  })

  it('is a dialog with Cancel on a desktop, opened from the creature panel', async () => {
    const user = userEvent.setup()
    setViewportWidth('desktop')
    renderApp('#/bestiary/blackForest/Troll', vi.fn<Sender>())

    await user.click(screen.getByRole('button', { name: 'Un chiffre ou un nom faux ? Signale-le' }))
    await user.click(inSheet().getByRole('button', { name: 'Annuler' }))

    expect(screen.queryByRole('dialog', { name: 'Signaler' })).not.toBeInTheDocument()
  })

  it('sends what waits when the app opens, and when the network comes back', async () => {
    const sender = vi.fn<Sender>().mockRejectedValueOnce(new SendError(null))
    const outbox = createOutbox(null, sender)
    const waiting: Report = {
      kind: 'bug',
      text: 'Rien ne se passe.',
      website: '',
      context: {
        version: '1.3.0',
        gameVersion: '0.221.4',
        language: 'fr',
        width: 390,
        screen: 'settings',
        shows: [],
      },
    }
    await outbox.submit(waiting, 'Rien ne se passe.')
    sender.mockResolvedValueOnce({ number: 51 })

    renderWithStore(<App />, { language: 'fr' }, { outbox })
    await waitFor(() => {
      expect(outbox.pending()).toEqual([])
    })

    sender.mockRejectedValueOnce(new SendError(null))
    await outbox.submit(waiting, 'Rien ne se passe.')
    sender.mockResolvedValueOnce({ number: 52 })
    window.dispatchEvent(new Event('online'))
    await waitFor(() => {
      expect(outbox.pending()).toEqual([])
    })
  })
})
