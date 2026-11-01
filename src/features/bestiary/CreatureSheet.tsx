import { Fragment, useId, useState, type ReactNode } from 'react'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { creatureHealth, staggerThreshold, toInflict } from '@/combat/creature'
import { game } from '@/data'
import { attackBarrier, type AttackVerdicts } from '@/combat/attack'
import type { World } from '@/combat/world'
import type { GameCreature, GameHit } from '@/data/types'
import { EffectsCard } from '@/features/effects/EffectsCard'
import { useLit } from '@/features/effects/lit'
import { creatureHits } from '@/features/effects/model'
import { CrashCard } from '@/features/report/Crash'
import type { Crash } from '@/features/report/model'
import { useCreatureOrigin } from '@/features/report/origins'
import { ReportLink } from '@/features/report/ReportLink'
import { useOpenReport } from '@/features/report/useReport'
import { useWet } from '@/features/weather/wet'
import type { Catalog } from '@/i18n/fr'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { BackIcon, ChevronRightIcon } from '@/ui/icons'
import type { Tone } from '@/ui/tones'
import { AdviceLine, GuardIcon } from '@/ui/verdicts'
import styles from './CreatureSheet.module.css'
import {
  assess,
  attackRange,
  creatureName,
  fightersOf,
  hitTypes,
  isTool,
  modifierRows,
  type AssessedAttack,
  type AssessedHits,
  type Assessment,
  type DeathSummon,
  type Fighter,
  type Hazards,
  type ShownModifier,
} from './model'
import { AttackPills, AttackTags, CreatureName, TypeTags } from './parts'
import { bestiaryRoute, type Place } from './place'
import {
  adviceShown,
  blockShown,
  damageText,
  dodgeShown,
  parryShown,
  type Shown,
  useAttackSummary,
  useFight,
  useHitsSummary,
} from './wording'

const simulationRoute = ({ fighter, attack }: AssessedAttack): Route => ({
  screen: 'simulation',
  path: [fighter.id, attack.ids[0] ?? ''],
  query: '',
  modal: null,
})

/**
 * Everything about taking one creature, at the stars picked: health, what staggers it, its weaknesses
 * and each attack against your gear. A page of its own on a phone, a panel beside the list on a
 * desktop.
 */
export function CreatureSheet({
  creature,
  place,
  layout,
}: {
  readonly creature: GameCreature
  readonly place: Place
  readonly layout: 'page' | 'panel'
}) {
  const t = useT()
  const language = useLanguage()
  const { on, barrier } = useLit(creature)
  const { defence, world } = useFight(on)
  const [stars, setStars] = useState(creature.stars.min)
  const assessment = assess(creature, defence, world, stars)
  const advice = adviceShown(assessment, t, language)
  const starOptions = Array.from(
    { length: creature.stars.max - creature.stars.min + 1 },
    (_, index) => creature.stars.min + index,
  )
  const advices = [
    ...new Map(
      starOptions.map((option) => {
        const shown = adviceShown(assess(creature, defence, world, option), t, language)
        return [shown.text, shown]
      }),
    ).values(),
  ]
  const threshold = staggerThreshold(creature, stars)
  const biome = useBiomeLine(place)
  const name = creatureName(creature, language)

  const health = formatNumber(creatureHealth(creature.health, stars), language)
  const inflict =
    threshold === null
      ? t.creature.neverStaggers
      : formatNumber(Math.round(toInflict(threshold, world)), language)
  const report = useCreatureOrigin({
    creature,
    stars,
    assessment,
    health,
    toInflict: inflict,
    on,
    barrier: barrier?.on ?? false,
  })

  const parry: { tone: Tone; text: string } = !assessment.canParry
    ? { tone: 'none', text: t.creature.cannotParry }
    : creature.staggeredByParry
      ? { tone: 'ok', text: t.creature.parryStaggers }
      : { tone: 'none', text: t.creature.parryDoesNot }

  const body = (
    <>
      <div className={styles.stats}>
        <Stat label={t.creature.health} short={t.creature.healthShort} value={health} numeric />
        <Stat label={t.creature.toInflict} value={inflict} numeric={threshold !== null} />
        <Stat label={t.creature.yourParry} value={parry.text} tone={parry.tone} />
        {layout === 'panel' && (
          <Stat
            label={t.bestiary.howToTake}
            value={<HeldAdvice advices={advices} shown={advice.text} layout={layout} />}
          />
        )}
      </div>
      {layout === 'page' && <HeldAdvice advices={advices} shown={advice.text} layout={layout} />}
      <EffectsCard creature={creature} hits={creatureHits(creature)} stars={stars} />
      <Modifiers creature={creature} />
      {layout === 'page' ? (
        <AttackList
          creature={creature}
          assessment={assessment}
          place={place}
          barrier={shieldOf(barrier, world, stars, t)}
        />
      ) : (
        <AttackTable
          creature={creature}
          assessment={assessment}
          place={place}
          barrier={shieldOf(barrier, world, stars, t)}
        />
      )}
      <ReportLink origin={report} label={t.report.fromCreature} />
    </>
  )

  const starPicker = starOptions.length > 1 && (
    <div role="group" aria-label={t.creature.stars} className={styles.stars}>
      {starOptions.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === stars}
          className={styles.star}
          onClick={() => {
            setStars(option)
          }}
        >
          {t.creature.star(option)}
        </button>
      ))}
    </div>
  )

  if (layout === 'page') {
    return (
      <main className={styles.page}>
        <PageHeader creature={creature} place={place} />
        <div className={styles.pageBody}>
          {starPicker}
          {body}
        </div>
      </main>
    )
  }

  return (
    <section aria-label={name} className={styles.panel}>
      <div className={styles.panelBody}>
        <div className={styles.panelHeader}>
          <div className={styles.panelTitles}>
            <h2 className={styles.panelTitle}>
              <CreatureName creature={creature} />
            </h2>
            {biome && <span className={styles.biome}>{biome}</span>}
          </div>
          {starPicker}
        </div>
        {body}
      </div>
    </section>
  )
}

/** The top of a creature's page on a phone: the way back to the list, its name and its biome. */
function PageHeader({
  creature,
  place,
}: {
  readonly creature: GameCreature
  readonly place: Place
}) {
  const t = useT()
  const biome = useBiomeLine(place)
  return (
    <div className={styles.pageHeader}>
      <RouteLink
        to={bestiaryRoute(place.biome, null, place.query)}
        how="return"
        aria-label={t.creature.back}
        className={styles.back}
      >
        <BackIcon size={22} />
      </RouteLink>
      <h1 className={styles.pageTitle}>
        <CreatureName creature={creature} />
      </h1>
      {biome && <span className={styles.biome}>{biome}</span>}
    </div>
  )
}

/** A creature's sheet that failed while drawing: a card in its place, which tries again or reports the
 * crash in the report sheet; on a phone, its page keeps the way back and the name. */
export function CreatureSheetCrash({
  creature,
  place,
  layout,
  crash,
  onRetry,
}: {
  readonly creature: GameCreature
  readonly place: Place
  readonly layout: 'page' | 'panel'
  readonly crash: Crash
  readonly onRetry: () => void
}) {
  const t = useT()
  const language = useLanguage()
  const openReport = useOpenReport()
  const name = creatureName(creature, language)
  const card = (
    <CrashCard
      title={t.crash.sheetTitle}
      note={t.crash.sheetNote}
      onRetry={onRetry}
      onReport={() => {
        openReport({
          screen: 'creature',
          kind: 'bug',
          heading: name,
          title: name,
          subject: creatureName(creature, 'en'),
          ids: { creature: creature.id },
          shows: [],
          lines: [],
          crash,
        })
      }}
    />
  )
  if (layout === 'page') {
    return (
      <main className={styles.page}>
        <PageHeader creature={creature} place={place} />
        <div className={styles.pageBody}>{card}</div>
      </main>
    )
  }
  return (
    <section aria-label={name} className={styles.panel}>
      <div className={styles.panelBody}>{card}</div>
    </section>
  )
}

/** The advice at every star in the same place, as large as the longest, so that picking stars moves
 * nothing under it (issue #59): the advice `shown` alone is seen and read. A line under the stats on a
 * phone, a card's text on a desktop. */
function HeldAdvice({
  advices,
  shown,
  layout,
}: {
  readonly advices: readonly Shown[]
  readonly shown: string
  readonly layout: 'page' | 'panel'
}) {
  return (
    <span className={`${styles.held ?? ''} ${layout === 'page' ? (styles.advice ?? '') : ''}`}>
      {advices.map(({ tone, text }) => {
        const hidden = text === shown ? undefined : true
        return layout === 'page' ? (
          <span key={text} aria-hidden={hidden} className={styles.heldLayer}>
            <AdviceLine tone={tone} text={text} />
          </span>
        ) : (
          <span
            key={text}
            aria-hidden={hidden}
            className={`${styles.heldLayer ?? ''} ${styles[tone] ?? ''}`}
          >
            {text}
          </span>
        )
      })}
    </span>
  )
}

function Stat({
  label,
  short,
  value,
  numeric = false,
  tone,
}: {
  readonly label: string
  readonly short?: string
  readonly value: ReactNode
  readonly numeric?: boolean
  readonly tone?: Tone
}) {
  return (
    <div role="group" aria-label={label} className={styles.stat}>
      <span aria-hidden="true" className={styles.statLabel}>
        {short ?? label}
      </span>
      <span
        className={`${numeric ? (styles.statNumber ?? '') : (styles.statText ?? '')} ${tone ? (styles[tone] ?? '') : ''}`}
      >
        {value}
      </span>
    </div>
  )
}

/** The body's row of chips, then one per weak spot, by the name of its part. */
function Modifiers({ creature }: { readonly creature: GameCreature }) {
  const t = useT()
  const language = useLanguage()
  const labelId = useId()
  const rows = modifierRows(creature)
  const parted = rows.length > 1
  return (
    <div className={styles.modifiers}>
      <span id={labelId} className={styles.label}>
        {t.creature.modifiers}
      </span>
      <div className={parted ? styles.parts : undefined}>
        {rows.map(({ part, modifiers }) => {
          const name = part?.[language] ?? t.creature.body
          return (
            <Fragment key={name}>
              {parted && (
                <span aria-hidden="true" className={styles.partName}>
                  {name}
                </span>
              )}
              <ModifierChips
                modifiers={modifiers}
                label={parted ? t.creature.modifiersOn(name) : undefined}
                labelledBy={parted ? undefined : labelId}
              />
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

/** One chip per damage type not taken normally and per tool not ignored, in the game's words;
 * neutral, never a verdict. */
function ModifierChips({
  modifiers,
  label,
  labelledBy,
}: {
  readonly modifiers: readonly ShownModifier[]
  readonly label: string | undefined
  readonly labelledBy: string | undefined
}) {
  const t = useT()
  const language = useLanguage()
  const look = (multiplier: number) =>
    multiplier === 0 ? styles.immune : multiplier >= 1 ? styles.weak : styles.resistant
  return (
    <div className={styles.chips}>
      {modifiers.length > 0 && (
        <ul aria-label={label} aria-labelledby={labelledBy} className={styles.chipList}>
          {modifiers.map(({ type, modifier, multiplier }) => (
            <li key={type} className={`${styles.chip ?? ''} ${look(multiplier) ?? ''}`}>
              <DamageTypeIcon type={type} className={styles.chipIcon} />
              {t.creature.modifier(
                (isTool(type) ? game.toolTypes[type] : game.damageTypes[type])[language],
                modifier === null ? null : game.modifiers[modifier][language],
                multiplier,
              )}
            </li>
          ))}
        </ul>
      )}
      <span className={styles.rest}>
        {modifiers.length > 0 ? t.creature.everythingElse : t.creature.noModifier}
      </span>
    </div>
  )
}

/** The attacks by phase, with what hits apart from them: one group without a heading for a creature
 * that has no phase. */
function byFighter(creature: GameCreature, assessment: Assessment) {
  return fightersOf(creature).map((fighter, index) => ({
    fighter,
    index,
    attacks: assessment.attacks.filter((assessed) => assessed.fighter === fighter),
    hazards: assessment.hazards.find((hazards) => hazards.fighter === fighter) ?? null,
  }))
}

/** Where the sheet of a creature a death brings opens: in the biome shown when it lives there. */
const sheetRoute = (creature: GameCreature, place: Place) =>
  bestiaryRoute(
    creature.biomes.includes(place.biome) ? place.biome : (creature.biomes[0] ?? place.biome),
    creature.id,
    place.query,
  )

const radiusOf = (hits: readonly GameHit[]) => Math.max(0, ...hits.map((hit) => hit.radius ?? 0))

/** Whether anything comes under « On its death ». */
const hasDeath = (hazards: Hazards) => hazards.death !== null || hazards.summons.length > 0

function PhaseHeading({
  creature,
  fighter,
  index,
  children,
}: {
  readonly creature: GameCreature
  readonly fighter: Fighter
  readonly index: number
  readonly children?: ReactNode
}) {
  const t = useT()
  if (!creature.phases) return null
  return (
    <span className={styles.phase}>
      {t.creature.phase(index + 1, fighter.health)}
      {children}
    </span>
  )
}

/** Phone: one link per attack, its verdicts in one sentence for screen readers. */
function AttackList({
  creature,
  assessment,
  place,
  barrier,
}: {
  readonly creature: GameCreature
  readonly assessment: Assessment
  readonly place: Place
  readonly barrier: Shield
}) {
  const t = useT()
  const language = useLanguage()
  const summary = useAttackSummary()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={styles.attacks}>
      <div className={styles.attacksHeader}>
        <h2 id={headingId} className={styles.label}>
          {t.creature.attacks}
        </h2>
        <span aria-hidden="true" className={styles.damageHead}>
          {t.creature.damageShort}
        </span>
        <span aria-hidden="true" className={styles.pillHeads}>
          <GuardIcon guard="block" size={13} />
          <GuardIcon guard="parry" size={13} />
          <GuardIcon guard="dodge" size={13} />
        </span>
      </div>
      {byFighter(creature, assessment).map(({ fighter, index, attacks: own, hazards }) => (
        <div key={fighter.id} className={styles.group}>
          <PhaseHeading creature={creature} fighter={fighter} index={index}>
            {own.length === 0 && ` · ${t.creature.noAttack}`}
          </PhaseHeading>
          {own.map((assessed) => {
            const { attack, damage, verdicts } = assessed
            const shield = barrier(attack.hits, damage)
            const content = (
              <>
                <span className={styles.attackName}>
                  <span className={styles.attackTitle}>{attack.name[language]}</span>
                  <AttackTags attack={attack} />
                  {shield && <span className={styles.barrier}>{shield}</span>}
                </span>
                <span className={styles.damage}>{damageText(damage, language)}</span>
                {verdicts ? <AttackPills verdicts={verdicts} /> : <span />}
              </>
            )
            return verdicts ? (
              <RouteLink
                key={attack.ids[0]}
                to={simulationRoute(assessed)}
                aria-label={`${summary(attack, damage, verdicts)}${shield ? ` ${shield}.` : ''} ${t.creature.openSimulation}`}
                className={styles.attackRow}
              >
                {content}
                <ChevronRightIcon size={16} className={styles.chevron} />
              </RouteLink>
            ) : (
              <div key={attack.ids[0]} className={styles.attackRow}>
                {content}
              </div>
            )
          })}
          {hazards && <HazardList creature={creature} hazards={hazards} place={place} />}
        </div>
      ))}
      <p className={styles.note}>{t.creature.tapToSimulate}</p>
    </section>
  )
}

/** Desktop: the attacks as a table, the verdicts spelt out. */
function AttackTable({
  creature,
  assessment,
  place,
  barrier,
}: {
  readonly creature: GameCreature
  readonly assessment: Assessment
  readonly place: Place
  readonly barrier: Shield
}) {
  const t = useT()
  const language = useLanguage()
  return (
    <>
      <div className={styles.tableBox}>
        <table aria-label={t.creature.attacks} className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{t.creature.attack}</th>
              <th scope="col" className={styles.rangeColumn}>
                {t.creature.range}
              </th>
              <th scope="col" className={styles.numeric}>
                {t.creature.damage}
              </th>
              <th scope="col">{t.verdicts.block}</th>
              <th scope="col">{t.verdicts.parry}</th>
              <th scope="col">{t.verdicts.dodge}</th>
              <th scope="col">
                <span className="visually-hidden">{t.creature.simulate}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {byFighter(creature, assessment).map(({ fighter, index, attacks: own, hazards }) => [
              creature.phases ? (
                <tr key={`${fighter.id}-phase`} className={styles.phaseRow}>
                  <th scope="colgroup" colSpan={7}>
                    <PhaseHeading creature={creature} fighter={fighter} index={index}>
                      {own.length === 0 && ` · ${t.creature.noAttack}`}
                    </PhaseHeading>
                  </th>
                </tr>
              ) : null,
              ...own.map((assessed) => {
                const { attack, damage, verdicts } = assessed
                const shield = barrier(attack.hits, damage)
                return (
                  <tr key={`${fighter.id}/${attack.ids[0] ?? ''}`}>
                    <th scope="row" className={styles.attackCell}>
                      <span className={styles.attackTitle}>{attack.name[language]}</span>
                      <AttackTags
                        attack={attack}
                        withRange={false}
                        rangeClassName={styles.rangeInCell}
                        className={styles.cellTags}
                      />
                      {shield && <span className={styles.barrier}>{shield}</span>}
                    </th>
                    <td className={`${styles.range ?? ''} ${styles.rangeColumn ?? ''}`}>
                      {attack.kind === 'summon'
                        ? t.creature.kinds.summon
                        : t.creature.metres(attackRange(attack))}
                    </td>
                    <td className={`${styles.numeric ?? ''} ${styles.tableDamage ?? ''}`}>
                      {damageText(damage, language)}
                    </td>
                    <VerdictCells verdicts={verdicts} />
                    <td>
                      {verdicts && damage !== null && (
                        <RouteLink
                          to={simulationRoute(assessed)}
                          aria-label={t.creature.simulateLabel(
                            attack.name[language],
                            Math.round(damage),
                          )}
                          className={styles.simulate}
                        >
                          <span className={styles.linkText}>{t.creature.simulate}</span>
                          <ChevronRightIcon size={14} />
                        </RouteLink>
                      )}
                    </td>
                  </tr>
                )
              }),
              hazards ? (
                <HazardTableRows
                  key={`${fighter.id}-hazards`}
                  creature={creature}
                  hazards={hazards}
                  place={place}
                />
              ) : null,
            ])}
          </tbody>
        </table>
      </div>
      <p className={styles.note}>{t.creature.desktopNote}</p>
    </>
  )
}

/** The block, parry and dodge cells of a row, spelt out; dashes when there is nothing to guard. */
function VerdictCells({ verdicts }: { readonly verdicts: AttackVerdicts | null }) {
  const t = useT()
  const shown = verdicts
    ? [
        blockShown(verdicts.block, t),
        parryShown(verdicts.parry, verdicts.parry !== null, t),
        dodgeShown(verdicts.dodgeable, t),
      ]
    : [null, null, null]
  return shown.map((cell, column) => (
    <td key={column} className={`${styles.verdict ?? ''} ${cell ? (styles[cell.tone] ?? '') : ''}`}>
      {cell?.text ?? '—'}
    </td>
  ))
}

/** Phone: trampling, then under « On its death » its blast and the creatures it brings. None opens
 * the Simulation; a creature brought opens its sheet. */
function HazardList({
  creature,
  hazards,
  place,
}: {
  readonly creature: GameCreature
  readonly hazards: Hazards
  readonly place: Place
}) {
  const t = useT()
  const { trample, death, summons } = hazards
  const radius = death ? radiusOf(death.hits) : 0
  return (
    <>
      {trample && (
        <HitsRow name={t.creature.trample} assessed={trample} tags={[t.creature.whenRunning]} />
      )}
      {hasDeath(hazards) && (
        <span className={styles.phase}>{t.creature.onDeath(creature.phases !== undefined)}</span>
      )}
      {death && (
        <HitsRow
          name={t.creature.deathBlast}
          assessed={death}
          tags={radius > 0 ? [t.creature.metres(radius)] : []}
        />
      )}
      {summons.map((summon) => (
        <SummonRow key={summon.creature?.id ?? summon.name.en} summon={summon} place={place} />
      ))}
    </>
  )
}

/** Phone: hits that are no attack, their verdicts in one sentence for screen readers. */
function HitsRow({
  name,
  assessed,
  tags,
}: {
  readonly name: string
  readonly assessed: AssessedHits
  readonly tags: readonly string[]
}) {
  const language = useLanguage()
  const summary = useHitsSummary()
  const { hits, damage, verdicts } = assessed
  return (
    <div className={styles.attackRow}>
      <span className="visually-hidden">{summary(name, hits, damage, verdicts)}</span>
      <span aria-hidden="true" className={styles.attackName}>
        <span className={styles.attackTitle}>{name}</span>
        <TypeTags types={hitTypes(hits)} tags={tags} />
      </span>
      <span aria-hidden="true" className={styles.damage}>
        {damageText(damage, language)}
      </span>
      {verdicts ? <AttackPills verdicts={verdicts} /> : <span />}
    </div>
  )
}

/** Phone: a creature a death brings, how many, and a way to its sheet when the Bestiary has one. */
function SummonRow({ summon, place }: { readonly summon: DeathSummon; readonly place: Place }) {
  const t = useT()
  const language = useLanguage()
  const name = summon.name[language]
  const count = t.creature.count(...summon.count)
  const title = <span className={styles.attackTitle}>{`${name} ${count}`}</span>
  if (!summon.creature) {
    return (
      <div className={styles.attackRow}>
        <span className={styles.attackName}>{title}</span>
      </div>
    )
  }
  return (
    <RouteLink
      to={sheetRoute(summon.creature, place)}
      aria-label={`${name} ${count}. ${t.creature.openSheet(name)}`}
      className={styles.attackRow}
    >
      <span className={styles.attackName}>
        {title}
        <TypeTags types={[]} tags={[t.creature.seeSheet]} />
      </span>
      <span />
      <span />
      <ChevronRightIcon size={16} className={styles.chevron} />
    </RouteLink>
  )
}

/** Desktop: the rows trampling and death add after a phase's attacks. */
function HazardTableRows({
  creature,
  hazards,
  place,
}: {
  readonly creature: GameCreature
  readonly hazards: Hazards
  readonly place: Place
}) {
  const t = useT()
  const language = useLanguage()
  const { trample, death, summons } = hazards
  const radius = death ? radiusOf(death.hits) : 0
  const hitsRow = (
    name: string,
    assessed: AssessedHits,
    tags: readonly string[],
    range: string,
  ) => (
    <tr>
      <th scope="row" className={styles.attackCell}>
        <span className={styles.attackTitle}>{name}</span>
        <TypeTags types={hitTypes(assessed.hits)} tags={tags} className={styles.cellTags}>
          {range !== '—' && <span className={styles.rangeInCell}> · {range}</span>}
        </TypeTags>
      </th>
      <td className={`${styles.range ?? ''} ${styles.rangeColumn ?? ''}`}>{range}</td>
      <td className={`${styles.numeric ?? ''} ${styles.tableDamage ?? ''}`}>
        {damageText(assessed.damage, language)}
      </td>
      <VerdictCells verdicts={assessed.verdicts} />
      <td />
    </tr>
  )
  return (
    <>
      {trample && hitsRow(t.creature.trample, trample, [], t.creature.whenRunning)}
      {hasDeath(hazards) && (
        <tr className={styles.phaseRow}>
          <th scope="colgroup" colSpan={7}>
            <span className={styles.phase}>
              {t.creature.onDeath(creature.phases !== undefined)}
            </span>
          </th>
        </tr>
      )}
      {death &&
        hitsRow(
          t.creature.deathBlast,
          death,
          [t.creature.kinds.area],
          radius > 0 ? t.creature.metres(radius) : '—',
        )}
      {summons.map((summon) => {
        const name = summon.name[language]
        const count = t.creature.count(...summon.count)
        return (
          <tr key={summon.creature?.id ?? summon.name.en}>
            <th scope="row" className={styles.attackCell}>
              <span className={styles.attackTitle}>{`${name} ${count}`}</span>
            </th>
            <td className={`${styles.range ?? ''} ${styles.rangeColumn ?? ''}`}>—</td>
            <td className={`${styles.numeric ?? ''} ${styles.tableDamage ?? ''}`}>—</td>
            <VerdictCells verdicts={null} />
            <td>
              {summon.creature && (
                <RouteLink
                  to={sheetRoute(summon.creature, place)}
                  aria-label={`${name} ${count}. ${t.creature.openSheet(name)}`}
                  className={styles.simulate}
                >
                  <span className={styles.linkText}>{t.creature.sheet}</span>
                  <ChevronRightIcon size={14} />
                </RouteLink>
              )}
            </td>
          </tr>
        )
      })}
    </>
  )
}

/** The biome a sheet is shown in, by its game name, with Wet beside it while it is on there. */
function useBiomeLine(place: Place) {
  const t = useT()
  const language = useLanguage()
  const wet = useWet()
  const name = game.biomes.find((candidate) => candidate.id === place.biome)?.name[language]
  if (name === undefined || !wet.on || wet.biome !== place.biome) return name
  return t.weather.beside(name, game.wet.name[language])
}

/** What the group's Magic barrier says under an attack, while it is on: how many such hits it takes, and
 * what it counts when not what the attack lists (its chop and pickaxe, the world). */
type Shield = (hits: readonly GameHit[], damage: number | null) => string | null

function shieldOf(
  barrier: { readonly capacity: number; readonly on: boolean } | null,
  world: World,
  stars: number,
  t: Catalog,
): Shield {
  return (hits, damage) => {
    if (!barrier?.on) return null
    const taken = attackBarrier(barrier.capacity, hits, world, stars)
    if (taken === null) return null
    const counted = Math.round(taken.counted)
    return t.barrier.hits(
      taken.hits,
      damage !== null && counted === Math.round(damage) ? null : counted,
    )
  }
}
