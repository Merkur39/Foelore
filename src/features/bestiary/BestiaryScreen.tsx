import { useId, useMemo, type ReactNode } from 'react'
import { CrashBoundary } from '@/app/CrashBoundary'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { replaceRoute } from '@/app/useRoute'
import { attackDamage, attackVerdicts } from '@/combat/attack'
import { creatureHealth, toInflict } from '@/combat/creature'
import { game } from '@/data'
import type { GameAttack, GameCreature } from '@/data/types'
import { BrokenRow } from '@/features/report/Crash'
import { orElse, type Crash } from '@/features/report/model'
import { useOpenReport } from '@/features/report/useReport'
import { useWet } from '@/features/weather/wet'
import type { Language } from '@/i18n/detect'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronRightIcon, CloseIcon, SearchIcon } from '@/ui/icons'
import { AdviceLine, GuardIcon, VerdictLegend, VerdictPill } from '@/ui/verdicts'
import styles from './BestiaryScreen.module.css'
import { BiomeStepper } from './BiomeStepper'
import { CreatureSheet, CreatureSheetCrash } from './CreatureSheet'
import { assess, creatureName, creaturesOf, search, type FoundAttack } from './model'
import { AttackPills, AttackTags, CreatureName, Highlighted } from './parts'
import { bestiaryRoute, placeOf, type Place } from './place'
import {
  adviceShown,
  blockShown,
  damageText,
  dodgeShown,
  parryShown,
  useAttackSummary,
  useFight,
} from './wording'

/** The home screen: a biome's creatures and how to take them, or what a search finds in every biome;
 * the sheet of a creature takes the whole screen on a phone, sits beside the list on a desktop. */
export function BestiaryScreen({ route }: { readonly route: Route }) {
  const isDesktop = useIsDesktop()
  const place = placeOf(route, useAppState().biome)
  const t = useT()

  if (isDesktop) {
    const selected = place.creature ?? creaturesOf(place.biome)[0] ?? null
    return (
      <main className={styles.desktop}>
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>{t.screens.bestiary}</h1>
          <p className={styles.intro}>{t.bestiary.intro}</p>
        </div>
        <div className={styles.split}>
          <div className={styles.finder}>
            <Finder place={place} selected={selected?.id ?? null} />
          </div>
          {selected && (
            <CrashBoundary
              key={selected.id}
              fallback={(crash, retry) => (
                <CreatureSheetCrash
                  creature={selected}
                  place={place}
                  layout="panel"
                  crash={crash}
                  onRetry={retry}
                />
              )}
            >
              <CreatureSheet creature={selected} place={place} layout="panel" />
            </CrashBoundary>
          )}
        </div>
      </main>
    )
  }

  if (place.creature) {
    const { creature } = place
    return (
      <CrashBoundary
        key={creature.id}
        fallback={(crash, retry) => (
          <CreatureSheetCrash
            creature={creature}
            place={place}
            layout="page"
            crash={crash}
            onRetry={retry}
          />
        )}
      >
        <CreatureSheet creature={creature} place={place} layout="page" />
      </CrashBoundary>
    )
  }
  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.bestiary}</h1>
      <Finder place={place} selected={null} />
    </main>
  )
}

function Finder({ place, selected }: { readonly place: Place; readonly selected: string | null }) {
  const t = useT()
  const language = useLanguage()
  const update = useUpdate()
  const wet = useWet().on
  const searching = place.query.trim() !== ''
  return (
    <>
      <SearchField place={place} />
      {searching ? (
        <SearchResults place={place} selected={selected} />
      ) : (
        <>
          <BiomeStepper
            biome={place.biome}
            detail={(index, total) => {
              const count = t.bestiary.biomeCount(index, total, creaturesOf(place.biome).length)
              return wet ? t.weather.beside(count, game.wet.name[language]) : count
            }}
            onChange={(biome) => {
              // Only a pick says where the player is: a creature found in another biome does not.
              update({ biome })
              replaceRoute(bestiaryRoute(biome, null, ''))
            }}
          />
          <div className={styles.listHeader}>
            <span className={styles.label}>{t.bestiary.howToTake}</span>
            <span className={styles.meta}>{t.bestiary.withoutEffects}</span>
          </div>
          <ul aria-label={t.bestiary.creatures} className={styles.list}>
            {creaturesOf(place.biome).map((creature) => (
              <li key={creature.id} className={styles.item}>
                <RowNet creature={creature}>
                  <CreatureRow
                    creature={creature}
                    to={bestiaryRoute(place.biome, creature.id, '')}
                    current={creature.id === selected}
                    query=""
                    biome={null}
                  />
                </RowNet>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className={styles.legend}>
        <VerdictLegend words={t.verdicts} />
      </div>
    </>
  )
}

function SearchField({ place }: { readonly place: Place }) {
  const t = useT()
  const searchIn = (query: string) => {
    replaceRoute(bestiaryRoute(place.biome, place.creature?.id ?? null, query))
  }
  // A label around the field: the whole box takes a tap, not only the text line.
  return (
    <label className={styles.search}>
      <SearchIcon size={18} className={styles.searchIcon} />
      <input
        type="search"
        aria-label={t.bestiary.search}
        placeholder={t.bestiary.searchPlaceholder}
        value={place.query}
        onChange={(event) => {
          searchIn(event.target.value)
        }}
        className={styles.searchInput}
      />
      {place.query !== '' && (
        <button
          type="button"
          aria-label={t.bestiary.clearSearch}
          className={styles.clear}
          onClick={() => {
            searchIn('')
          }}
        >
          <CloseIcon size={18} />
        </button>
      )}
    </label>
  )
}

/** A row of a creature, or of one of its attacks, under its own net: if it fails while drawing, a short
 * row reports it, and the rest of the list stays. */
function RowNet({
  creature,
  attack = null,
  children,
}: {
  readonly creature: GameCreature
  readonly attack?: GameAttack | null
  readonly children: ReactNode
}) {
  return (
    <CrashBoundary
      fallback={(crash) => <BrokenCreatureRow creature={creature} attack={attack} crash={crash} />}
    >
      {children}
    </CrashBoundary>
  )
}

function BrokenCreatureRow({
  creature,
  attack,
  crash,
}: {
  readonly creature: GameCreature
  readonly attack: GameAttack | null
  readonly crash: Crash
}) {
  const language = useLanguage()
  const openReport = useOpenReport()
  const attackId = attack?.ids[0]
  const named = (shown: Language) => {
    const name = orElse(() => creatureName(creature, shown), creature.id)
    return attack ? `${name} · ${orElse(() => attack.name[shown], attackId ?? '')}` : name
  }
  const name = named(language)
  return (
    <BrokenRow
      name={name}
      className={styles.brokenRow}
      onReport={() => {
        openReport({
          screen: 'bestiary',
          kind: 'bug',
          heading: name,
          title: name,
          subject: named('en'),
          ids: { creature: creature.id, ...(attackId ? { attack: attackId } : {}) },
          shows: [],
          lines: [],
          crash,
        })
      }}
    />
  )
}

/** A creature at its lowest stars: health, the worst verdict of each guard, one piece of advice. */
function CreatureRow({
  creature,
  to,
  current,
  query,
  biome,
}: {
  readonly creature: GameCreature
  readonly to: Route
  readonly current: boolean
  readonly query: string
  /** Shown before the health in search results, which span every biome. */
  readonly biome: string | null
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const { defence, world } = useFight()
  const stars = creature.stars.min
  const assessment = assess(creature, defence, world, stars)
  const advice = adviceShown(assessment, t, language)
  const stats = [
    biome,
    creature.boss ? t.bestiary.boss : null,
    t.bestiary.health(Math.round(toInflict(creatureHealth(creature.health, stars), world))),
  ]
    .filter((part) => part !== null)
    .join(' · ')
  const block = blockShown(assessment.block, t)
  const parry = parryShown(assessment.parry, assessment.canParry, t)
  const dodge = dodgeShown(assessment.dodgeable, t)
  const pillSize = isDesktop ? 'compact' : 'row'
  return (
    <RouteLink to={to} aria-current={current ? 'true' : undefined} className={styles.row}>
      <span className={styles.rowTop}>
        <span className={styles.rowName}>
          <span className={styles.name}>
            <CreatureName creature={creature} query={query} />
          </span>
          <span className={styles.meta}>{stats}</span>
        </span>
        <span className={styles.pills}>
          <VerdictPill
            guard="block"
            tone={block.tone}
            label={t.verdicts.pill(t.verdicts.block, block.text)}
            size={pillSize}
          />
          <VerdictPill
            guard="parry"
            tone={parry.tone}
            label={t.verdicts.pill(t.verdicts.parry, parry.text)}
            size={pillSize}
          />
          <VerdictPill
            guard="dodge"
            tone={dodge.tone}
            label={t.verdicts.pill(t.verdicts.dodge, dodge.text)}
            size={pillSize}
          />
        </span>
      </span>
      <AdviceLine
        tone={advice.tone}
        text={advice.text}
        withIcon={!isDesktop}
        className={styles.rowAdvice}
      />
    </RouteLink>
  )
}

function SearchResults({
  place,
  selected,
}: {
  readonly place: Place
  readonly selected: string | null
}) {
  const t = useT()
  const language = useLanguage()
  const found = useMemo(() => search(place.query, language), [place.query, language])
  const creaturesId = useId()
  const attacksId = useId()
  const biomeName = (creature: GameCreature) =>
    game.biomes.find((biome) => biome.id === creature.biomes[0])?.name[language] ?? null

  return (
    <div aria-live="polite" className={styles.results}>
      {found.creatures.length === 0 && found.attacks.length === 0 && (
        <p className={styles.note}>{t.bestiary.nothingFound(place.query.trim())}</p>
      )}
      {found.creatures.length > 0 && (
        <section aria-labelledby={creaturesId} className={styles.resultSection}>
          <div className={styles.listHeader}>
            <h2 id={creaturesId} className={styles.label}>
              {t.bestiary.foundCreatures(found.creatures.length)}
            </h2>
            <span className={styles.meta}>{t.bestiary.withoutEffects}</span>
          </div>
          <ul className={styles.resultList}>
            {found.creatures.map((creature) => (
              <li key={creature.id} className={styles.item}>
                <RowNet creature={creature}>
                  <CreatureRow
                    creature={creature}
                    to={bestiaryRoute(creature.biomes[0] ?? place.biome, creature.id, place.query)}
                    current={creature.id === selected}
                    query={place.query}
                    biome={biomeName(creature)}
                  />
                </RowNet>
              </li>
            ))}
          </ul>
        </section>
      )}
      {found.attacks.length > 0 && (
        <section aria-labelledby={attacksId} className={styles.resultSection}>
          <div className={`${styles.listHeader ?? ''} ${styles.attackGrid ?? ''}`}>
            <h2 id={attacksId} className={styles.label}>
              {t.bestiary.foundAttacks(found.attacks.length)}
            </h2>
            <span className={styles.damageHead} aria-hidden="true">
              {t.creature.damageShort}
            </span>
            <span className={styles.pillHeads} aria-hidden="true">
              <GuardIcon guard="block" size={13} />
              <GuardIcon guard="parry" size={13} />
              <GuardIcon guard="dodge" size={13} />
            </span>
          </div>
          <ul className={styles.resultList}>
            {found.attacks.map((attack) => (
              <li
                key={`${attack.fighter.id}/${attack.attack.ids[0] ?? ''}`}
                className={styles.item}
              >
                <RowNet creature={attack.creature} attack={attack.attack}>
                  <FoundAttackRow found={attack} place={place} />
                </RowNet>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className={styles.note}>{t.bestiary.searchNote}</p>
    </div>
  )
}

/** An attack found by the search; it opens its creature's sheet. */
function FoundAttackRow({ found, place }: { readonly found: FoundAttack; readonly place: Place }) {
  const t = useT()
  const language = useLanguage()
  const summary = useAttackSummary()
  const { defence, world } = useFight()
  const { creature, attack } = found
  const stars = creature.stars.min
  const damage = attackDamage(attack.hits, stars)
  const verdicts = attackVerdicts(defence, attack.hits, world, stars)
  const name = creatureName(creature, language)
  return (
    <RouteLink
      to={bestiaryRoute(creature.biomes[0] ?? place.biome, creature.id, place.query)}
      aria-label={`${name}, ${summary(attack, damage, verdicts)} ${t.creature.openSheet(name)}`}
      className={`${styles.attackRow ?? ''} ${styles.attackGrid ?? ''}`}
    >
      <span className={styles.attackName}>
        <span className={styles.attackTitle}>
          {name} · <Highlighted text={attack.name[language]} query={place.query} />
        </span>
        <AttackTags attack={attack} />
      </span>
      <span className={styles.damage}>{damageText(damage, language)}</span>
      {verdicts ? <AttackPills verdicts={verdicts} size="row" /> : <span />}
      <ChevronRightIcon size={16} className={styles.chevron} />
    </RouteLink>
  )
}
