import { useEffect, useId, useState } from 'react'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { openModal, useRoute } from '@/app/useRoute'
import { attackAdvice } from '@/combat/advice'
import {
  attackBarrier,
  attackDamage,
  hardestRange,
  type AttackHit,
  type RollRange,
} from '@/combat/attack'
import { LOWEST_ROLL, type Guard, type HitResult } from '@/combat/hit'
import type { OverTime } from '@/combat/overTime'
import type { GameRuleEffect } from '@/data/types'
import { game } from '@/data'
import { creatureName, type FoundAttack } from '@/features/bestiary/model'
import { AttackTags } from '@/features/bestiary/parts'
import { useFight } from '@/features/bestiary/wording'
import { EffectsCard } from '@/features/effects/EffectsCard'
import { useLit } from '@/features/effects/lit'
import { useSimulationOrigin } from '@/features/report/origins'
import { ReportLink } from '@/features/report/ReportLink'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import type { OverTimeKind } from '@/i18n/fr'
import {
  BestiaryIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DodgeIcon,
  MinusIcon,
  PlusIcon,
} from '@/ui/icons'
import { StepButton } from '@/ui/StepButton'
import { verdictTone, type Tone } from '@/ui/tones'
import { AdviceLine } from '@/ui/verdicts'
import { findAttack, oddsFraction, refOf, withRecent } from './model'
import styles from './SimulationScreen.module.css'

const BAR_STEPS = [0, 25, 50, 75] as const
const DEFAULT_VALUE = 90
const VALUE_STEP = 5

// A free value hits as a plain physical blow the guard can take; the world scales it, no star does.
const freeHit = (value: number): AttackHit => ({
  damages: { blunt: value },
  staggerMultiplier: 1,
  blockable: true,
  dodgeable: true,
})

const oneDecimal = (value: number) => Math.round(value * 10) / 10

const NONE_ON: readonly GameRuleEffect[] = []

// What the status effects deal over time, and the damage type each takes from the hit.
const OVER_TIME: readonly (readonly [OverTimeKind, 'fire' | 'poison' | 'spirit'])[] = [
  ['burning', 'fire'],
  ['poison', 'poison'],
  ['spirit', 'spirit'],
]
const NOTHING: OverTime = { damage: 0, seconds: 0 }

/** What a guard leaves on the stagger bar, never past its end. */
const barTotal = ({ bar }: HitResult) => Math.min(bar.limit, bar.before + bar.shield + bar.armor)

/** « L'attaque d'abord »: the attack of the address, else the last one simulated, against your
 * gear; a free value stands in for an attack on demand. */
export function SimulationScreen({ route }: { readonly route: Route }) {
  const { recentAttacks } = useAppState()
  const update = useUpdate()
  const ref = refOf(route) ?? recentAttacks[0] ?? null
  const found = ref ? findAttack(ref) : null
  // « Détails » stays open from one attack to the next, until the player leaves the screen.
  const [detailsOpen, setDetailsOpen] = useState(false)

  // The attack an address names joins the recent ones; the store saves them.
  useEffect(() => {
    const named = refOf(route)
    if (named === null || findAttack(named) === null) return
    const first = recentAttacks[0]
    if (first?.fighter === named.fighter && first.attack === named.attack) return
    update({ recentAttacks: withRecent(recentAttacks, named) })
  }, [route, recentAttacks, update])

  return (
    <Simulator
      key={found ? `${found.fighter.id}/${found.attack.ids[0] ?? ''}` : 'none'}
      found={found}
      detailsOpen={detailsOpen}
      onDetails={() => {
        setDetailsOpen((open) => !open)
      }}
    />
  )
}

function Simulator({
  found,
  detailsOpen,
  onDetails,
}: {
  readonly found: FoundAttack | null
  readonly detailsOpen: boolean
  readonly onDetails: () => void
}) {
  const t = useT()
  const language = useLanguage()
  const route = useRoute()
  const isDesktop = useIsDesktop()
  const [mode, setMode] = useState<'attack' | 'value'>('attack')
  const attackMode = mode === 'attack'
  // A free value has no type to resist: what is on counts for an attack only.
  const lit = useLit(found?.creature ?? null)
  const on = attackMode ? lit.on : NONE_ON
  const { defence, world } = useFight(on)
  const [stars, setStars] = useState(found?.creature.stars.min ?? 0)
  const [bar, setBar] = useState<number>(0)
  const [value, setValue] = useState(DEFAULT_VALUE)
  const barId = useId()

  const hits = attackMode ? (found?.attack.hits ?? null) : [freeHit(value)]
  const options = { stars: attackMode ? stars : 0, barBefore: bar / 100 }
  const blockRange = hits && hardestRange(defence, hits, world, { guard: 'block', ...options })
  const parryRange = hits && hardestRange(defence, hits, world, { guard: 'parry', ...options })
  // The cards, the advice and the report read the top of the roll: never too kind.
  const block = blockRange?.top ?? null
  const parry = parryRange?.top ?? null
  const dodgeable = attackMode && found ? found.attack.hits.every((hit) => hit.dodgeable) : null
  const report = useSimulationOrigin({
    found: attackMode ? found : null,
    stars,
    value,
    bar,
    block,
    parry,
    dodgeable,
    on,
    barrier: attackMode && (lit.barrier?.on ?? false),
  })
  // The group's Magic barrier, while it is on: how many such hits it takes before what the cards read.
  const shield =
    attackMode && found && lit.barrier?.on
      ? attackBarrier(lit.barrier.capacity, found.attack.hits, world, stars)
      : null

  const modeSwitch = (
    <div role="group" aria-label={t.simulation.source} className={styles.segments}>
      {(['attack', 'value'] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === mode}
          className={styles.segment}
          onClick={() => {
            setMode(option)
          }}
        >
          {t.simulation.modes[option]}
        </button>
      ))}
    </div>
  )

  const starOptions = found
    ? Array.from(
        { length: found.creature.stars.max - found.creature.stars.min + 1 },
        (_, index) => found.creature.stars.min + index,
      )
    : []

  const hitControls = attackMode ? (
    found ? (
      <>
        <AttackChip found={found} stars={stars} />
        {starOptions.length > 1 && (
          <div className={styles.labelled}>
            {isDesktop && (
              <span aria-hidden="true" className={styles.label}>
                {t.simulation.starsShort}
              </span>
            )}
            <div role="group" aria-label={t.simulation.stars} className={styles.segments}>
              {starOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={option === stars}
                  className={`${styles.segment ?? ''} ${styles.mono ?? ''}`}
                  onClick={() => {
                    setStars(option)
                  }}
                >
                  {t.creature.star(option)}
                </button>
              ))}
            </div>
          </div>
        )}
        <EffectsCard creature={found.creature} hits={found.attack.hits} stars={stars} />
      </>
    ) : (
      <div className={styles.empty}>
        <span className={styles.note}>{t.simulation.noAttack}</span>
        <button
          type="button"
          className={styles.pick}
          onClick={() => {
            openModal('attack')
          }}
        >
          {t.simulation.pick}
        </button>
      </div>
    )
  ) : (
    <div className={styles.valueRow}>
      <div role="group" aria-label={t.simulation.value} className={styles.stepper}>
        <StepButton
          label={t.simulation.lower}
          className={styles.stepButton}
          onStep={() => {
            setValue((current) => Math.max(0, current - VALUE_STEP))
          }}
        >
          <MinusIcon />
        </StepButton>
        <span className={styles.value}>{value}</span>
        <StepButton
          label={t.simulation.raise}
          className={styles.stepButton}
          onStep={() => {
            setValue((current) => current + VALUE_STEP)
          }}
        >
          <PlusIcon />
        </StepButton>
      </div>
      <span className={styles.note}>{t.simulation.valueNote}</span>
    </div>
  )

  const barControls = (
    <div className={styles.barRow}>
      <span id={barId} className={styles.label}>
        {t.simulation.bar}
      </span>
      <div role="group" aria-labelledby={barId} className={styles.segments}>
        {BAR_STEPS.map((step) => (
          <button
            key={step}
            type="button"
            aria-pressed={step === bar}
            className={`${styles.segment ?? ''} ${styles.mono ?? ''}`}
            onClick={() => {
              setBar(step)
            }}
          >
            {t.simulation.barOption(step)}
          </button>
        ))}
      </div>
    </div>
  )

  const result = blockRange && block && (
    <>
      {shield && (
        <p className={styles.barrier}>
          {t.barrier.takes(game.barrier.name[language], shield.hits, Math.round(shield.counted))}
        </p>
      )}
      <Advice block={block} parry={parry} dodgeable={dodgeable} />
      <div className={styles.cards}>
        <ResultCard
          label={t.simulation.blocking}
          result={block}
          low={detailsOpen ? blockRange.low : null}
        />
        <ResultCard
          label={t.simulation.parrying}
          result={parry}
          low={detailsOpen ? (parryRange?.low ?? null) : null}
        />
      </div>
      <Details block={blockRange} parry={parryRange} open={detailsOpen} onToggle={onDetails} />
      {attackMode && dodgeable !== null && (
        <span
          className={`${styles.dodge ?? ''} ${dodgeable ? (styles.ok ?? '') : (styles.bad ?? '')}`}
        >
          <DodgeIcon size={16} strokeWidth={2} />
          <span>{dodgeable ? t.simulation.dodgeable : t.simulation.undodgeable}</span>
        </span>
      )}
      {attackMode && found && found.attack.hits.length > 1 && (
        <span className={styles.note}>{t.simulation.hits(found.attack.hits.length)}</span>
      )}
      <ReportLink origin={report} label={t.report.fromVerdict} />
    </>
  )

  if (isDesktop) {
    return (
      <main className={styles.desktop}>
        <div className={styles.desktopBody}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{t.screens.simulation}</h1>
            <p className={styles.intro}>{t.simulation.intro}</p>
          </div>
          <div className={styles.columns}>
            <section aria-labelledby={`${barId}-hit`} className={styles.hitPanel}>
              <h2 id={`${barId}-hit`} className={styles.panelTitle}>
                {t.simulation.hit}
              </h2>
              {modeSwitch}
              {hitControls}
              {barControls}
              <RouteLink to={{ ...route, modal: 'gear' }} className={styles.thresholds}>
                {t.simulation.thresholds}
                <ChevronRightIcon size={14} />
              </RouteLink>
            </section>
            <section aria-labelledby={`${barId}-result`} className={styles.result}>
              <h2 id={`${barId}-result`} className="visually-hidden">
                {t.simulation.result}
              </h2>
              {result}
            </section>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.simulation}</h1>
      {modeSwitch}
      <section aria-label={t.simulation.hit} className={styles.hitPanel}>
        {hitControls}
        {barControls}
      </section>
      {result}
    </main>
  )
}

/** The attack simulated: a way to change it. */
function AttackChip({ found, stars }: { readonly found: FoundAttack; readonly stars: number }) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const route = useRoute()
  const { creature, attack } = found
  const damage = Math.round(attackDamage(attack.hits, stars) ?? 0)
  const biome = game.biomes.find((candidate) => candidate.id === creature.biomes[0])
  const extra = isDesktop ? (biome ? [biome.name[language]] : []) : [t.simulation.change]
  return (
    <RouteLink
      to={{ ...route, modal: 'attack' }}
      aria-label={t.simulation.changeLabel(
        creatureName(creature, language),
        attack.name[language],
        damage,
      )}
      className={styles.chip}
    >
      <BestiaryIcon size={22} className={styles.chipIcon} />
      <span className={styles.chipText}>
        <span className={styles.chipName}>
          {creatureName(creature, language)} · {attack.name[language]}
        </span>
        <AttackTags attack={attack} withRange={false} extra={extra} />
      </span>
      <span className={styles.chipDamage}>{formatNumber(damage, language)}</span>
      {isDesktop ? (
        <span className={styles.change}>{t.simulation.change}</span>
      ) : (
        <ChevronRightIcon size={16} className={styles.chevron} />
      )}
    </RouteLink>
  )
}

function Advice({
  block,
  parry,
  dodgeable,
}: {
  readonly block: HitResult
  readonly parry: HitResult | null
  readonly dodgeable: boolean | null
}) {
  const t = useT()
  const advice = attackAdvice({ block: block.verdict, parry: parry?.verdict ?? null })
  let shown: { tone: Tone; text: string }
  if (advice.action === 'block') shown = { tone: 'ok', text: t.simulation.advice.block }
  else if (advice.action === 'parry')
    shown = {
      tone: 'warn',
      text: t.simulation.advice.parry(advice.block === 'broken' ? 'broken' : 'staggered'),
    }
  else
    shown = {
      tone: 'bad',
      text: t.simulation.advice.dodge(dodgeable, advice.guard, advice.setback),
    }
  return <AdviceLine tone={shown.tone} text={shown.text} className={styles.advice} />
}

/** One guard against the hit: its verdict, what you take, what it costs, and the bar it leaves; with
 * `low`, the bar runs from the lowest roll (solid) to the highest (hatched). */
function ResultCard({
  label,
  result,
  low = null,
}: {
  readonly label: string
  readonly result: HitResult | null
  readonly low?: HitResult | null
}) {
  const t = useT()
  const language = useLanguage()
  if (result === null) {
    return (
      <div role="group" aria-label={label} className={`${styles.card ?? ''} ${styles.none ?? ''}`}>
        <span aria-hidden="true" className={styles.label}>
          {label}
        </span>
        <span className={styles.cannot}>{t.creature.cannotParry}</span>
      </div>
    )
  }
  const tone = verdictTone(result.verdict)
  const { limit } = result.bar
  const total = barTotal(result)
  const overflows = result.staggered
  const shown = low ?? result
  // Each part of the bar in its turn, never past the end; then, open, the stretch the roll may add.
  let used = 0
  const widths = [shown.bar.before, shown.bar.shield, shown.bar.armor].map((part) => {
    const width = Math.min(100 - used, (Math.max(0, part) / limit) * 100)
    used += width
    return width
  })
  const lowTotal = barTotal(shown)
  const stretch = Math.min(100 - used, Math.max(0, ((total - lowTotal) / limit) * 100))
  const barLabel =
    low && !low.staggered
      ? t.simulation.barRangeLabel(
          oneDecimal(lowTotal),
          oneDecimal(total),
          oneDecimal(limit),
          overflows,
        )
      : t.simulation.barLabel(oneDecimal(total), oneDecimal(limit), overflows)
  return (
    <div role="group" aria-label={label} className={`${styles.card ?? ''} ${styles[tone] ?? ''}`}>
      <span aria-hidden="true" className={styles.label}>
        {label}
      </span>
      <span className={styles.verdict}>{t.verdicts[result.verdict]}</span>
      <span className={styles.taken}>
        {formatNumber(oneDecimal(result.taken), language)}{' '}
        <span className={styles.unit}>{t.simulation.taken}</span>
      </span>
      <span className={styles.stamina}>{t.simulation.stamina(Math.round(result.stamina))}</span>
      <div role="img" aria-label={barLabel} className={styles.bar}>
        <span className={styles.barBefore} style={{ width: `${String(widths[0])}%` }} />
        <span className={styles.barShield} style={{ width: `${String(widths[1])}%` }} />
        <span className={styles.barArmor} style={{ width: `${String(widths[2])}%` }} />
        {stretch > 0 && (
          <span className={styles.barRange} style={{ width: `${String(stretch)}%` }} />
        )}
      </div>
      <span className={`${styles.barText ?? ''} ${overflows ? (styles.overflows ?? '') : ''}`}>
        {overflows
          ? t.simulation.barOverflows
          : t.simulation.barTotal(oneDecimal(total), oneDecimal(limit))}
      </span>
    </div>
  )
}

/** What « Détails » says of a guard across the roll: what lands at once, then how often its verdict comes,
 * what burns or poisons after, and the bar it fills. */
function useDetailLines() {
  const t = useT()
  const language = useLanguage()
  return (guard: Guard, { low, top, odds }: RollRange) => {
    const lines: string[] = []
    if (odds < 1) {
      const [times, of] = oddsFraction(odds)
      lines.push(t.simulation.details.odds(guard, top.verdict, times, of, low.verdict))
    }
    for (const [kind, type] of OVER_TIME) {
      const atTop = top[kind]
      if (atTop === null) continue
      const name = game.damageTypes[type][language]
      const rounded = ({ damage, seconds }: OverTime) => ({ damage: oneDecimal(damage), seconds })
      lines.push(
        atTop.damage === 0
          ? t.simulation.details.fizzled(name, kind)
          : t.simulation.details.overTime(name, rounded(low[kind] ?? NOTHING), rounded(atTop)),
      )
    }
    if (!top.staggered && top.verdict !== 'unblockable') {
      lines.push(
        t.simulation.details.bar(
          oneDecimal(barTotal(low)),
          oneDecimal(barTotal(top)),
          oneDecimal(top.bar.limit),
        ),
      )
    }
    return {
      taken: t.simulation.details.range(oneDecimal(low.direct), oneDecimal(top.direct)),
      lines,
    }
  }
}

/** « Détails », folded under the cards: for each guard, what the game deals across its roll, and what burns
 * or poisons after. Nothing for a hit the game does not roll that leaves nothing over time. */
function Details({
  block,
  parry,
  open,
  onToggle,
}: {
  readonly block: RollRange
  readonly parry: RollRange | null
  readonly open: boolean
  readonly onToggle: () => void
}) {
  const t = useT()
  const listId = useId()
  const linesOf = useDetailLines()
  const ranges = parry ? [block, parry] : [block]
  const rolled = ranges.some((range) => range.rolled)
  const lasts = ranges.some((range) => OVER_TIME.some(([kind]) => range.top[kind] !== null))
  if (!rolled && !lasts) return null
  const blocked = linesOf('block', block)
  const parried = parry && linesOf('parry', parry)
  // A hit no guard takes reads the same either way: one line.
  const rows =
    parried === null
      ? [{ label: t.simulation.blocking, ...blocked }]
      : JSON.stringify(blocked) === JSON.stringify(parried)
        ? [{ label: t.simulation.hit, ...blocked }]
        : [
            { label: t.simulation.blocking, ...blocked },
            { label: t.simulation.parrying, ...parried },
          ]

  return (
    <div className={styles.details}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        className={styles.detailsHead}
        onClick={onToggle}
      >
        <span className={styles.detailsTitles}>
          <span className={styles.detailsTitle}>{t.simulation.details.title}</span>
          <span className={styles.detailsSummary}>
            {rolled
              ? t.simulation.details.rolled(Math.round(LOWEST_ROLL * 100))
              : t.simulation.details.unrolled}
          </span>
        </span>
        <ChevronDownIcon size={18} className={styles.detailsChevron} />
      </button>
      <div
        id={listId}
        role="group"
        aria-label={t.simulation.details.title}
        hidden={!open}
        className={styles.detailsList}
      >
        {rows.map((row) => (
          <DetailRow key={row.label} {...row} />
        ))}
      </div>
    </div>
  )
}

function DetailRow({
  label,
  taken,
  lines,
}: {
  readonly label: string
  readonly taken: string
  readonly lines: readonly string[]
}) {
  const t = useT()
  const labelId = useId()
  return (
    <div role="group" aria-labelledby={labelId} className={styles.detailRow}>
      <span id={labelId} className={styles.detailGuard}>
        {label}
      </span>
      <span className={styles.detailLines}>
        <span className={styles.detailTaken}>
          {taken} <span className={styles.unit}>{t.simulation.taken}</span>
        </span>
        {lines.map((line) => (
          <span key={line} className={styles.detailNote}>
            {line}
          </span>
        ))}
      </span>
    </div>
  )
}
