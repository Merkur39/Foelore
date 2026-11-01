import { useId } from 'react'
import { blockerOf, gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { useIsDesktop } from '@/app/useMediaQuery'
import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier } from '@/combat/modifiers'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type { GameRuleEffect } from '@/data/types'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { useEffectWording } from '@/features/effects/wording'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { ChevronRightIcon, MinusIcon, PlusIcon } from '@/ui/icons'
import { NumberField } from '@/ui/NumberField'
import { StepButton } from '@/ui/StepButton'
import { effectOf, NOTHING_CARRIED, type Carried } from './carried'
import { allDrinksCarried, allPowersTaken, type GearList } from './lists'
import { blockPowerParts, leveled, maxLevel, withstand, type GuardGauge } from './model'
import { pieceOf, SLOTS, summarize, type Pieces } from './pieces'
import styles from './GearForm.module.css'

// Wide enough for any gear of the game; the field only keeps a typo in bounds.
const MAX_HEALTH = 999

/** The fields of « Ton équipement », and what you can take with them in `world`, worked out again as
 * `gear` changes: in its dialog, and as a question of the first arrival. Each row of what is held, worn
 * or carried opens its list (`onOpenList`), where it is picked. The group's powers only with `withGroup`:
 * the first arrival asks for your own gear. */
export function GearForm({
  gear,
  world,
  onChange,
  onOpenList,
  withGroup = false,
}: {
  readonly gear: Gear
  readonly world: World
  readonly onChange: (change: Partial<Gear>) => void
  readonly onOpenList: (list: GearList) => void
  readonly withGroup?: boolean
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const withstandId = useId()
  const heldId = useId()

  const blocker = blockerOf(gear.blocker)
  const defence = gearDefence(gear)
  const taken = withstand(defence, world)
  const parts = blockPowerParts(blocker, gear.level, gear.skill)

  return (
    <div className={styles.form}>
      <section aria-labelledby={withstandId} className={styles.withstand}>
        <div className={styles.withstandHeader}>
          <h3 id={withstandId} className={styles.label}>
            {t.gear.withstand}
          </h3>
          <span className={styles.meta}>{t.gear.emptyBar}</span>
        </div>
        {!isDesktop && (
          <div aria-hidden="true" className={styles.legend}>
            <span className={styles.key}>
              <span className={`${styles.swatch ?? ''} ${styles.okFill ?? ''}`} />
              {t.gear.unstaggered}
            </span>
            <span className={styles.key}>
              <span className={`${styles.swatch ?? ''} ${styles.warnFill ?? ''}`} />
              {t.gear.unbroken}
            </span>
            <span className={styles.key}>
              <span className={`${styles.swatch ?? ''} ${styles.badFill ?? ''}`} />
              {t.verdicts.broken}
            </span>
          </div>
        )}
        <GuardRow
          name={t.gear.block}
          gauge={taken.block}
          scale={taken.scale}
          compact={!isDesktop}
        />
        <GuardRow
          name={t.gear.parry}
          gauge={taken.parry}
          scale={taken.scale}
          compact={!isDesktop}
        />
        <span className={styles.meta}>
          {t.gear.staggersAt(
            taken.staggerAt,
            game.player.staggerFactor * 100,
            gear.maxHealth,
            defence.armor,
          )}
          {isDesktop && ` · ${t.gear.powerParts(parts.base, parts.skill)}`}
        </span>
      </section>

      <NumberField
        label={t.gear.health}
        value={gear.maxHealth}
        min={1}
        max={MAX_HEALTH}
        lowerLabel={t.gear.lowerHealth}
        raiseLabel={t.gear.raiseHealth}
        onChange={(maxHealth) => {
          onChange({ maxHealth })
        }}
      />
      <NumberField
        label={t.gear.skill}
        value={gear.skill}
        min={0}
        max={100}
        lowerLabel={t.gear.lowerSkill}
        raiseLabel={t.gear.raiseSkill}
        onChange={(skill) => {
          onChange({ skill })
        }}
      />

      <section aria-labelledby={heldId} className={styles.section}>
        <h3 id={heldId} className={styles.label}>
          {t.gear.held}
        </h3>
        <div className={styles.rows}>
          <Row
            label={t.gear.held}
            unlabelled
            value={blocker.name[language]}
            onOpen={() => {
              onOpenList({ kind: 'hand' })
            }}
            level={leveled(blocker) ? gear.level : undefined}
            max={maxLevel(blocker)}
            onLevel={(level) => {
              onChange({ level })
            }}
          />
        </div>
      </section>

      <PiecesSection gear={gear} onChange={onChange} onOpenList={onOpenList} />
      <CarriedSection
        carried={gear.carried ?? NOTHING_CARRIED}
        full={allDrinksCarried(gear)}
        onOpenList={onOpenList}
      />
      {withGroup && (
        <GroupSection
          group={(gear.carried ?? NOTHING_CARRIED).group}
          full={allPowersTaken(gear)}
          onOpenList={onOpenList}
        />
      )}
    </div>
  )
}

/** The pieces worn, slot by slot, their armor, and what they and their complete sets resist. */
function PiecesSection({
  gear,
  onChange,
  onOpenList,
}: {
  readonly gear: Gear
  readonly onChange: (change: Partial<Gear>) => void
  readonly onOpenList: (list: GearList) => void
}) {
  const t = useT()
  const language = useLanguage()
  const headingId = useId()
  const pieces: Pieces = gear.pieces ?? {}
  const summary = summarize(pieces)
  const typed = gear.pieces === undefined && gear.armor > 0
  const n = (value: number) => formatNumber(value, language)

  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.label}>
        {t.gear.pieces}
      </h3>
      <div className={styles.rows}>
        {SLOTS.map((slot) => {
          const worn = pieces[slot]
          return (
            <Row
              key={slot}
              label={t.gear.slots[slot]}
              value={worn ? pieceOf(worn.id).name[language] : t.gear.noPiece}
              onOpen={() => {
                onOpenList({ kind: 'piece', slot })
              }}
              level={worn?.level ?? null}
              max={worn ? maxLevel(pieceOf(worn.id)) : 1}
              onLevel={(level) => {
                if (worn) onChange({ pieces: { ...pieces, [slot]: { ...worn, level } } })
              }}
            />
          )
        })}
      </div>

      <div className={styles.total}>
        <div className={styles.totalLine}>
          <span className={styles.totalName}>
            <span className={styles.totalLabel}>{t.gear.armor}</span>
            <span className={styles.totalValue}>{n(typed ? gear.armor : summary.armor)}</span>
          </span>
          {summary.parts.length > 0 && (
            <span className={styles.parts}>{t.gear.armorParts(summary.parts)}</span>
          )}
        </div>
        {typed && <p className={styles.note}>{t.gear.typedArmor}</p>}
        <Resistances modifiers={summary.modifiers} />
        {summary.sets.map((set) => (
          <SetBlock key={set.id} set={set} />
        ))}
      </div>
    </section>
  )
}

/** The trinket, the power and the drinks one carries, each with how long it lasts and what it changes:
 * none counts until switched on, on a creature's sheet or in the Simulation. Each row opens its list;
 * « Ajouter une boisson » opens the drinks not carried yet, while there are any. */
function CarriedSection({
  carried,
  full,
  onOpenList,
}: {
  readonly carried: Carried
  readonly full: boolean
  readonly onOpenList: (list: GearList) => void
}) {
  const t = useT()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.label}>
        {t.gear.carry}
      </h3>
      <div className={styles.rows}>
        <CarriedRow
          label={t.effects.kinds.trinket}
          id={carried.trinket}
          none={t.gear.noTrinket}
          onOpen={() => {
            onOpenList({ kind: 'trinket' })
          }}
        />
        <CarriedRow
          label={t.effects.kinds.power}
          id={carried.power}
          none={t.gear.noPower}
          onOpen={() => {
            onOpenList({ kind: 'power' })
          }}
        />
        {carried.drinks.map((drink, index) => (
          <CarriedRow
            key={drink}
            label={t.effects.kinds.consumable}
            id={drink}
            none={t.gear.noDrink}
            onOpen={() => {
              onOpenList({ kind: 'drink', index })
            }}
          />
        ))}
        {!full && (
          <button
            type="button"
            className={styles.add}
            onClick={() => {
              onOpenList({ kind: 'drink', index: null })
            }}
          >
            <PlusIcon size={16} />
            {t.gear.addDrink}
          </button>
        )}
      </div>
      <p className={styles.note}>{t.gear.carriedNote}</p>
    </section>
  )
}

/** The powers players of the group cast on you, each its row like yours, and a way to add one neither
 * yours nor the group's yet, while there is any. */
function GroupSection({
  group,
  full,
  onOpenList,
}: {
  readonly group: readonly string[]
  readonly full: boolean
  readonly onOpenList: (list: GearList) => void
}) {
  const t = useT()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className={styles.section}>
      <h3 id={headingId} className={styles.label}>
        {t.gear.group}
      </h3>
      <div className={styles.rows}>
        {group.map((power, index) => (
          <CarriedRow
            key={power}
            label={t.effects.kinds.power}
            id={power}
            none={t.gear.noPower}
            onOpen={() => {
              onOpenList({ kind: 'group', index })
            }}
          />
        ))}
        {!full && (
          <button
            type="button"
            className={styles.add}
            onClick={() => {
              onOpenList({ kind: 'group', index: null })
            }}
          >
            <PlusIcon size={16} />
            {t.gear.addGroupPower}
          </button>
        )}
      </div>
      <p className={styles.note}>{t.gear.groupNote}</p>
    </section>
  )
}

/** A row of what one carries: its kind over what it holds, a way to its list, then how long it lasts and
 * what it changes. */
function CarriedRow({
  label,
  id,
  none,
  onOpen,
}: {
  readonly label: string
  readonly id: string | null
  readonly none: string
  readonly onOpen: () => void
}) {
  const t = useT()
  const language = useLanguage()
  const wording = useEffectWording()
  const effect = id === null ? null : effectOf(id)
  const value = effect ? effect.name[language] : none
  return (
    <div className={styles.carriedRow}>
      <button
        type="button"
        aria-label={t.gear.rowValue(label, value)}
        className={styles.rowMain}
        onClick={onOpen}
      >
        <span className={styles.rowLabel}>{label}</span>
        <span className={styles.rowValue}>{value}</span>
        <ChevronRightIcon size={14} className={styles.chevron} />
      </button>
      {effect && (
        <span className={styles.effectLines}>
          {wording.lines(effect).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </span>
      )}
    </div>
  )
}

/** One chip per damage type, the game's names: a weakness stands out, a resistance recedes. */
function Resistances({
  modifiers,
}: {
  readonly modifiers: ReturnType<typeof summarize>['modifiers']
}) {
  const t = useT()
  const language = useLanguage()
  const shown = DAMAGE_TYPES.flatMap((type) => {
    const modifier = modifiers[type]
    return modifier === undefined || modifier === 'normal' || modifier === 'ignore'
      ? []
      : [{ type, modifier, multiplier: damageMultiplier(modifier) }]
  })
  if (shown.length === 0) return null
  return (
    <ul aria-label={t.gear.resistances} className={styles.chips}>
      {shown.map(({ type, modifier, multiplier }) => (
        <li
          key={type}
          className={`${styles.chip ?? ''} ${multiplier > 1 ? (styles.weak ?? '') : ''}`}
        >
          <DamageTypeIcon type={type} className={styles.chipIcon} />
          {t.creature.modifier(
            game.damageTypes[type][language],
            game.modifiers[modifier][language],
            multiplier,
          )}
        </li>
      ))}
    </ul>
  )
}

/** A set worn whole, by its name in the game, and what it changes. */
function SetBlock({ set }: { readonly set: GameRuleEffect }) {
  const t = useT()
  const language = useLanguage()
  const byMultiplier = new Map<number, string[]>()
  for (const type of DAMAGE_TYPES) {
    const modifier = set.modifiers?.[type]
    if (modifier === undefined || modifier === 'normal' || modifier === 'ignore') continue
    const multiplier = damageMultiplier(modifier)
    byMultiplier.set(multiplier, [
      ...(byMultiplier.get(multiplier) ?? []),
      game.damageTypes[type][language],
    ])
  }
  const changes = [
    ...[...byMultiplier].map(([multiplier, types]) => t.gear.setModifier(types, multiplier)),
    ...(set.dodgeStaminaModifier ? [t.gear.dodgeCost(-set.dodgeStaminaModifier * 100)] : []),
  ]
  return (
    <div role="group" aria-label={t.gear.fullSet} className={styles.set}>
      <span className={styles.setLabel}>{t.gear.fullSet}</span>
      <span className={styles.setName}>{set.name[language]}</span>
      {changes.map((change) => (
        <span key={change} className={styles.setChange}>
          {change}
        </span>
      ))}
    </div>
  )
}

/** A row of what Your gear holds: its name over what it holds (or the name above the box, `unlabelled`),
 * a way to its list, its level on the right. */
function Row({
  label,
  unlabelled = false,
  value,
  onOpen,
  level,
  max,
  onLevel,
}: {
  readonly label: string
  readonly unlabelled?: boolean
  readonly value: string
  readonly onOpen: () => void
  /** Null when the row holds nothing; undefined for what has no level (bare hands): no stepper. */
  readonly level: number | null | undefined
  readonly max: number
  readonly onLevel: (level: number) => void
}) {
  const t = useT()
  return (
    <div className={styles.row}>
      <button
        type="button"
        aria-label={t.gear.rowValue(label, value)}
        className={styles.rowMain}
        onClick={onOpen}
      >
        {!unlabelled && <span className={styles.rowLabel}>{label}</span>}
        <span className={styles.rowValue}>{value}</span>
        <ChevronRightIcon size={14} className={styles.chevron} />
      </button>
      {level !== undefined && (
        <span role="group" aria-label={t.gear.levelOf(label, level)} className={styles.stepper}>
          <StepButton
            label={t.gear.lowerLevelOf(label)}
            disabled={level === null || level <= 1}
            className={styles.step}
            onStep={() => {
              if (level !== null) onLevel(level - 1)
            }}
          >
            <MinusIcon size={14} />
          </StepButton>
          <span className={styles.stepValue}>
            {level === null ? '—' : t.gear.levelValue(level)}
          </span>
          <StepButton
            label={t.gear.raiseLevelOf(label)}
            disabled={level === null || level >= max}
            className={styles.step}
            onStep={() => {
              if (level !== null) onLevel(level + 1)
            }}
          >
            <PlusIcon size={14} />
          </StepButton>
        </span>
      )}
    </div>
  )
}

const percent = (value: number, scale: number) =>
  `${String((Math.min(value, scale) / scale) * 100)}%`

/** A guard's thresholds, and the gauge that draws them: ok up to the first, warn up to the second,
 * bad past it. Hits are counted whole: the largest whole hit the guard takes. */
function GuardRow({
  name,
  gauge,
  scale,
  compact,
}: {
  readonly name: string
  readonly gauge: GuardGauge | null
  readonly scale: number
  /** Phone: the legend above names the thresholds, so the line shows the numbers alone; the words stay
   * for screen readers. */
  readonly compact: boolean
}) {
  const t = useT()
  const language = useLanguage()
  const n = (value: number) => formatNumber(value, language)
  const word = compact ? 'visually-hidden' : undefined
  return (
    <div role="group" aria-label={name} className={styles.guard}>
      <div className={styles.guardLine}>
        <span className={styles.guardName}>
          {name}
          {gauge && <span className={styles.power}> · {t.gear.power(gauge.power)}</span>}
        </span>
        {gauge ? (
          <span className={styles.thresholds}>
            <span className={word}>{t.gear.unstaggered} </span>
            <span className={styles.ok}>{n(Math.floor(gauge.unstaggered))}</span> ·{' '}
            <span className={word}>{t.gear.unbroken} </span>
            <span className={styles.warn}>{n(Math.floor(gauge.unbroken))}</span>
          </span>
        ) : (
          <span className={styles.thresholds}>{t.gear.cannotParry}</span>
        )}
      </div>
      <div aria-hidden="true" className={styles.gauge}>
        {gauge && (
          <>
            <span className={styles.okFill} style={{ width: percent(gauge.unstaggered, scale) }} />
            <span
              className={styles.warnFill}
              style={{ width: percent(gauge.unbroken - gauge.unstaggered, scale) }}
            />
            <span className={styles.badFill} />
          </>
        )}
      </div>
    </div>
  )
}
