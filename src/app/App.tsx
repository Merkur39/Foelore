import { useEffect, useLayoutEffect, useState } from 'react'
import { game } from '@/data'
import { FirstArrival } from '@/features/arrival/FirstArrival'
import { ArsenalScreen } from '@/features/arsenal/ArsenalScreen'
import { BestiaryScreen } from '@/features/bestiary/BestiaryScreen'
import { creatureName } from '@/features/bestiary/model'
import { placeOf } from '@/features/bestiary/place'
import { LitContext, useLitState } from '@/features/effects/lit'
import { GearModal } from '@/features/gear/GearModal'
import { GuideScreen } from '@/features/guide/GuideScreen'
import { InstallOffer } from '@/features/install/Install'
import { useInstallOffer } from '@/features/install/useInstall'
import { NoticesModal } from '@/features/notices/NoticesModal'
import { ScreenCrash } from '@/features/report/Crash'
import type { ReportOrigin } from '@/features/report/model'
import { NewsModal } from '@/features/report/NewsModal'
import { ReportSheet } from '@/features/report/ReportSheet'
import { ReportsModal } from '@/features/report/ReportsModal'
import { ThanksSheet } from '@/features/report/ThanksSheet'
import {
  OpenReportContext,
  useFixesSinceUpdate,
  useSendWaitingReports,
} from '@/features/report/useReport'
import { SettingsModal } from '@/features/settings/SettingsModal'
import { AttackPicker } from '@/features/simulation/AttackPicker'
import { findAttack, refOf } from '@/features/simulation/model'
import { SimulationScreen } from '@/features/simulation/SimulationScreen'
import { useWetState, WetContext } from '@/features/weather/wet'
import { WorldModal } from '@/features/world/WorldModal'
import { useLanguage, useT } from '@/i18n/useT'
import styles from './App.module.css'
import { APP_NAME } from './brand'
import { CrashBoundary } from './CrashBoundary'
import { PreviewContext, usePreview, type Preview } from './preview'
import { routeHash, SCREENS, screenHash, type Route, type Screen } from './routes'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { TopBar } from './TopBar'
import { useAppState } from './useAppState'
import { useIsDesktop } from './useMediaQuery'
import { useRoute } from './useRoute'

/** The browser bar of a phone, and the title bar of the installed app, take the background of the
 * theme the root element now shows. */
function paintBrowserBar() {
  const background = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (background === '') return
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.append(meta)
  }
  meta.setAttribute('content', background)
}

export function App() {
  const [preview, setPreview] = useState<Preview>({})
  return (
    <PreviewContext value={preview}>
      <Shell onPreview={setPreview} />
    </PreviewContext>
  )
}

type Links = Readonly<Record<Screen, string>>

const screenLinks = (): Links =>
  Object.fromEntries(SCREENS.map((screen) => [screen, screenHash(screen)])) as Record<
    Screen,
    string
  >

/** Each tab returns to where its screen was left: the biome, the creature, the search. Kept up to
 * date while rendering, from the route of the previous render. */
function useScreenLinks(route: Route): Links {
  const [links, setLinks] = useState(screenLinks)
  const here = routeHash({ ...route, modal: null })
  if (links[route.screen] !== here) setLinks({ ...links, [route.screen]: here })
  return links
}

function Shell({ onPreview }: { readonly onPreview: (preview: Preview) => void }) {
  const route = useRoute()
  const { screen, modal } = route
  const isDesktop = useIsDesktop()
  const t = useT()
  const language = useLanguage()
  const preview = usePreview()
  const saved = useAppState()
  const theme = preview.theme ?? saved.theme
  const links = useScreenLinks(route)
  const [report, setReport] = useState<ReportOrigin | null>(null)
  useSendWaitingReports()
  const [fixes, dismissFixes] = useFixesSinceUpdate()
  const [installOffer, leaveInstallOffer] = useInstallOffer()
  const creature = screen === 'bestiary' ? placeOf(route, saved.biome).creature : null
  // The creature whose sheet or attack is shown, for which the effects switched on hold.
  const simulated = screen === 'simulation' ? (refOf(route) ?? saved.recentAttacks[0]) : undefined
  const lit = useLitState(
    creature?.id ?? (simulated ? (findAttack(simulated)?.creature.id ?? null) : null),
  )
  // Wet holds for the biome the Bestiary shows, and dries off when it shows another.
  const weather = useWetState(
    screen === 'bestiary' ? placeOf(route, saved.biome).biome : null,
    saved.biome ?? game.biomes[0]!.id,
  )
  // A creature's sheet takes the whole screen of a phone, bars included.
  const detail = !isDesktop && creature !== null
  const title = creature ? creatureName(creature, language) : t.screens[screen]

  // On the root element, before the first paint: <html lang> for screen readers and hyphenation, the
  // theme for the palette of src/styles/themes.css.
  useLayoutEffect(() => {
    document.documentElement.lang = language
  }, [language])
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    paintBrowserBar()
  }, [theme])
  useEffect(() => {
    document.title = `${title} — ${APP_NAME}`
  }, [title])

  return (
    <OpenReportContext value={setReport}>
      <LitContext value={lit}>
        <WetContext value={weather}>
          <div className={isDesktop ? styles.desktop : styles.phone}>
            {isDesktop ? <Sidebar screen={screen} links={links} /> : !detail && <TopBar />}
            {/* Each screen under its own net, which another tab leaves behind: the bars stay. */}
            <CrashBoundary
              key={screen}
              fallback={(crash, retry) => (
                <ScreenCrash screen={screen} crash={crash} onRetry={retry} />
              )}
            >
              {screen === 'bestiary' ? (
                <BestiaryScreen route={route} />
              ) : screen === 'simulation' ? (
                <SimulationScreen route={route} />
              ) : screen === 'arsenal' ? (
                <ArsenalScreen route={route} />
              ) : (
                <GuideScreen route={route} />
              )}
            </CrashBoundary>
            {!isDesktop && !detail && <TabBar screen={screen} links={links} />}
            {modal === 'settings' && <SettingsModal onPreview={onPreview} />}
            {modal === 'attack' && <AttackPicker />}
            {modal === 'gear' && <GearModal />}
            {modal === 'world' && <WorldModal />}
            {modal === 'reports' && <ReportsModal />}
            {modal === 'news' && <NewsModal />}
            {modal === 'notices' && <NoticesModal />}
            {/* Opened before the sheets below: each of them shows over the questions, the offer to
            install included, which comes first at a first launch. */}
            {!saved.onboarding && <FirstArrival />}
            {fixes.length > 0 && <ThanksSheet fixes={fixes} onClose={dismissFixes} />}
            {installOffer && <InstallOffer way={installOffer} onClose={leaveInstallOffer} />}
            {report && (
              <ReportSheet
                origin={report}
                onClose={() => {
                  setReport(null)
                }}
              />
            )}
          </div>
        </WetContext>
      </LitContext>
    </OpenReportContext>
  )
}
