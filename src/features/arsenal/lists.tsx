import type { ReactNode } from 'react'
import { CrashBoundary } from '@/app/CrashBoundary'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier, type DamageModifiers } from '@/combat/modifiers'
import { game } from '@/data'
import type { Localized } from '@/data/types'
import { Highlighted } from '@/features/bestiary/parts'
import { useEffectWording } from '@/features/effects/wording'
import type { CarriedEffect } from '@/features/gear/carried'
import { BrokenRow } from '@/features/report/Crash'
import { orElse, type Crash } from '@/features/report/model'
import { useOpenReport } from '@/features/report/useReport'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { DamageTypeIcon } from '@/ui/DamageTypeIcon'
import { CheckIcon, ChevronRightIcon, CloseIcon, SearchIcon } from '@/ui/icons'
import type { ArsenalSort, BlockerRow, CategoryRows, EffectRow, PieceRow } from './model'
import styles from './ArsenalScreen.module.css'

/** What a row does: open Your gear with its item (the Arsenal), or pick it (a list of Your gear). */
export type Select =
  | { readonly kind: 'open'; readonly to: (id: string) => Route }
  | { readonly kind: 'pick'; readonly onPick: (id: string) => void }

/** A list's first row, which takes off what the row of Your gear holds. */
export interface NoneRow {
  readonly label: string
  readonly note: string
  readonly onPick: () => void
}

/** A search field: the whole box takes a tap, and it clears with its own button. */
export function SearchField({
  query,
  label,
  placeholder,
  onSearch,
  compact = false,
}: {
  readonly query: string
  readonly label: string
  readonly placeholder: string
  readonly onSearch: (query: string) => void
  readonly compact?: boolean
}) {
  const t = useT()
  // A label around the field: the whole box takes a tap, not only the text line.
  return (
    <label className={`${styles.search ?? ''} ${compact ? (styles.compact ?? '') : ''}`}>
      <SearchIcon size={18} className={styles.searchIcon} />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          onSearch(event.target.value)
        }}
        className={styles.searchInput}
      />
      {query !== '' && (
        <button
          type="button"
          aria-label={t.arsenal.clearSearch}
          className={styles.clear}
          onClick={() => {
            onSearch('')
          }}
        >
          <CloseIcon size={compact ? 16 : 18} />
        </button>
      )}
    </label>
  )
}

// ---- What every row shows, on a phone and on a desktop. ----

type AnyRow = BlockerRow | PieceRow | EffectRow

const nameOf = (row: AnyRow): Localized =>
  'blocker' in row ? row.blocker.name : 'piece' in row ? row.piece.name : row.effect.name

type RowState = 'equipped' | 'carried' | 'group' | null

// Your power is equipped, a trinket or a drink carried; a power the group casts on you is told apart.
const stateOf = (row: AnyRow): RowState =>
  'effect' in row
    ? row.carried
      ? row.effect.kind === 'power'
        ? 'equipped'
        : 'carried'
      : row.group
        ? 'group'
        : null
    : row.equipped
      ? 'equipped'
      : null

/** What is yours: highlighted, and done in a table's action. */
const owns = (state: RowState) => state === 'equipped' || state === 'carried'

/** A row of the Arsenal that failed while drawing: its item, and a way to report it; the others stay. */
function BrokenItemRow({
  row,
  crash,
  className,
}: {
  readonly row: AnyRow
  readonly crash: Crash
  readonly className: string | undefined
}) {
  const language = useLanguage()
  const openReport = useOpenReport()
  const name = orElse(() => nameOf(row)[language], row.id)
  return (
    <BrokenRow
      name={name}
      className={className}
      onReport={() => {
        openReport({
          screen: 'arsenal',
          kind: 'bug',
          heading: name,
          title: name,
          subject: orElse(() => nameOf(row).en, row.id),
          ids: {},
          shows: [],
          lines: [],
          crash,
        })
      }}
    />
  )
}

/** The figures of what blocks: its block power, and its parry or why it has none. */
function useBlockerText(row: BlockerRow) {
  const t = useT()
  const language = useLanguage()
  const n = (value: number) => formatNumber(value, language)
  const { group } = row.blocker
  return {
    type:
      group === 'weapon' || group === 'other' || group === 'unarmed'
        ? null
        : t.gear.groupTags[group],
    power: n(row.power),
    parry: row.parry === null ? '—' : n(row.parry),
    parryNote: row.parry === null ? t.gear.noParry : t.gear.parryBonus(row.blocker.timedBlockBonus),
  }
}

const capitalised = (text: string) => `${text.charAt(0).toLocaleUpperCase()}${text.slice(1)}`

/** What an effect changes, a change a line, each starting with a capital. */
function useEffectText(effect: CarriedEffect) {
  const t = useT()
  const wording = useEffectWording()
  const duration = effect.ttl === undefined ? '' : t.effects.duration(effect.ttl)
  const extra =
    effect.adrenaline !== undefined
      ? t.arsenal.trigger(effect.adrenaline)
      : effect.cooldown !== undefined
        ? t.arsenal.cooldown(t.effects.duration(effect.cooldown))
        : null
  return {
    duration,
    extra,
    // The column says what it is: « 20 min », « dès 65 d'adrénaline ».
    column:
      effect.cooldown !== undefined && effect.adrenaline === undefined
        ? t.effects.duration(effect.cooldown)
        : extra,
    changes: wording.changes(effect).map(capitalised),
  }
}

/** A piece's set, when its bonus changes a fight: its name, its size, what it changes. */
function usePieceText(row: PieceRow) {
  const t = useT()
  const language = useLanguage()
  const wording = useEffectWording()
  return {
    armor: formatNumber(row.armor, language),
    perLevel: t.arsenal.perLevel(row.perLevel),
    set: row.set && {
      name: row.set.name[language],
      size: row.set.set?.size ?? 0,
      changes: wording.changes(row.set).join(' · '),
    },
    dodge: row.piece.dodgeStaminaModifier
      ? t.gear.dodgeCost(-row.piece.dodgeStaminaModifier * 100)
      : null,
  }
}

function Tag({
  children,
  owned = false,
}: {
  readonly children: ReactNode
  readonly owned?: boolean
}) {
  return <span className={owned ? styles.ownedTag : styles.tag}>{children}</span>
}

/** One chip per damage type, in the game's words: a weakness outlined. */
function Chips({ modifiers }: { readonly modifiers: DamageModifiers }) {
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
    <ul aria-label={t.arsenal.columns.resistances} className={styles.chips}>
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

// ---- Phone: a card per row. ----

export function Cards({
  found,
  query,
  select,
  none = null,
  limit = Infinity,
}: {
  readonly found: CategoryRows
  readonly query: string
  readonly select: Select
  readonly none?: NoneRow | null
  readonly limit?: number
}) {
  const t = useT()
  const rows: readonly AnyRow[] = found.rows.slice(0, limit)
  return (
    <ul aria-label={t.arsenal.categories[found.category]} className={styles.cards}>
      {none && (
        <li>
          <button
            type="button"
            aria-label={`${none.label}, ${none.note}.`}
            className={styles.noneCard}
            onClick={none.onPick}
          >
            <span className={styles.cardName}>{none.label}</span>
            <span className={styles.noneNote}>{none.note}</span>
          </button>
        </li>
      )}
      {rows.map((row) => (
        <li key={row.id}>
          <CrashBoundary
            fallback={(crash) => (
              <BrokenItemRow row={row} crash={crash} className={styles.brokenCard} />
            )}
          >
            <Card row={row} query={query} select={select} />
          </CrashBoundary>
        </li>
      ))}
    </ul>
  )
}

function Card({
  row,
  query,
  select,
}: {
  readonly row: AnyRow
  readonly query: string
  readonly select: Select
}) {
  const t = useT()
  const language = useLanguage()
  const name = nameOf(row)[language]
  const state = stateOf(row)
  const className = `${styles.card ?? ''} ${owns(state) ? (styles.owned ?? '') : ''}`
  const content = (
    <>
      <span className={styles.cardTop}>
        <span className={styles.cardName}>
          <Highlighted text={name} query={query} />
        </span>
        {'blocker' in row && <BlockerType row={row} />}
        {state && <Tag owned={owns(state)}>{t.arsenal[state]}</Tag>}
        <span className={styles.spacer} />
        <ChevronRightIcon size={16} className={styles.chevron} />
      </span>
      {'blocker' in row ? (
        <BlockerFigures row={row} />
      ) : 'piece' in row ? (
        <PieceFigures row={row} />
      ) : (
        <EffectFigures effect={row.effect} />
      )}
    </>
  )
  return select.kind === 'open' ? (
    <RouteLink
      to={select.to(row.id)}
      aria-label={t.arsenal.rowLabel(name, state)}
      className={className}
    >
      {content}
    </RouteLink>
  ) : (
    <button
      type="button"
      aria-label={t.arsenal.pickLabel(name, state)}
      className={className}
      onClick={() => {
        select.onPick(row.id)
      }}
    >
      {content}
    </button>
  )
}

function BlockerType({ row }: { readonly row: BlockerRow }) {
  const text = useBlockerText(row)
  return text.type && <Tag>{text.type}</Tag>
}

function Stat({
  label,
  value,
  note = null,
  strong = false,
  faint = false,
}: {
  readonly label: string
  readonly value: string
  readonly note?: string | null
  readonly strong?: boolean
  readonly faint?: boolean
}) {
  return (
    <span className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span
        className={`${strong ? (styles.statStrong ?? '') : (styles.statValue ?? '')} ${faint ? (styles.faint ?? '') : ''}`}
      >
        {value}
      </span>
      {note && <span className={styles.statNote}>{note}</span>}
    </span>
  )
}

function BlockerFigures({ row }: { readonly row: BlockerRow }) {
  const t = useT()
  const text = useBlockerText(row)
  return (
    <span className={styles.stats}>
      <Stat label={t.arsenal.columns.power} value={text.power} strong />
      <Stat
        label={t.arsenal.columns.parry}
        value={text.parry}
        note={text.parryNote}
        faint={row.parry === null}
      />
    </span>
  )
}

function PieceFigures({ row }: { readonly row: PieceRow }) {
  const t = useT()
  const text = usePieceText(row)
  return (
    <>
      <span className={styles.stats}>
        <Stat label={t.arsenal.columns.armor} value={text.armor} strong />
        <Stat label={t.arsenal.columns.perLevel} value={text.perLevel} />
      </span>
      <Chips modifiers={row.piece.modifiers} />
      {text.set && (
        <span className={styles.line}>
          {t.arsenal.setLine(text.set.name, text.set.size, text.set.changes)}
        </span>
      )}
      {text.dodge && <span className={styles.line}>{text.dodge}</span>}
    </>
  )
}

function EffectFigures({ effect }: { readonly effect: CarriedEffect }) {
  const text = useEffectText(effect)
  return (
    <>
      <span className={styles.when}>
        {[text.duration, text.extra].filter((part) => part !== null && part !== '').join(' · ')}
      </span>
      <span className={styles.changes}>
        {text.changes.map((change) => (
          <span key={change}>{change}</span>
        ))}
      </span>
    </>
  )
}

// ---- Desktop: a table per category. ----

export function CategoryTable({
  found,
  query,
  sort,
  select,
  none = null,
  scrolls = false,
}: {
  readonly found: CategoryRows
  readonly query: string
  readonly sort: ArsenalSort
  readonly select: Select
  readonly none?: NoneRow | null
  readonly scrolls?: boolean
}) {
  const t = useT()
  const { category } = found
  const sortedBy = (column: ArsenalSort) => (column === sort ? 'descending' : undefined)
  const head = (label: string, className?: string, sorting?: ArsenalSort) => (
    <th key={label} scope="col" aria-sort={sorting && sortedBy(sorting)} className={className}>
      {label}
      {sorting === sort && <span aria-hidden="true"> ↓</span>}
    </th>
  )
  const columns =
    found.kind === 'blocker'
      ? [
          ...(category === 'shields' ? [head(t.arsenal.columns.type, styles.typeColumn)] : []),
          head(t.arsenal.columns.power, styles.number, 'power'),
          head(t.arsenal.columns.parry, styles.number, 'parry'),
        ]
      : found.kind === 'piece'
        ? [
            <th key="armor" scope="col" aria-sort="descending" className={styles.number}>
              {t.arsenal.columns.armor}
              <span aria-hidden="true"> ↓</span>
            </th>,
            head(t.arsenal.columns.perLevel, styles.number),
            head(t.arsenal.columns.resistances, styles.wide),
            head(t.arsenal.columns.set, styles.wide),
          ]
        : [
            head(t.arsenal.columns.duration, styles.durationColumn),
            ...(found.category === 'drinks'
              ? []
              : [
                  head(
                    found.category === 'powers'
                      ? t.arsenal.columns.cooldown
                      : t.arsenal.columns.trigger,
                  ),
                ]),
            head(t.arsenal.changes[found.category], styles.wide),
          ]
  const rows: readonly AnyRow[] = found.rows
  // Each kind lays its columns out its own way.
  const kind = { blocker: styles.blockers, piece: styles.pieces, effect: '' }[found.kind] ?? ''
  return (
    <div className={`${styles.tableBox ?? ''} ${scrolls ? (styles.scrolls ?? '') : ''}`}>
      <table
        aria-label={t.arsenal.categories[category]}
        className={`${styles.table ?? ''} ${select.kind === 'pick' ? (styles.picking ?? '') : ''} ${kind}`}
      >
        <thead>
          <tr>
            <th scope="col" className={styles.nameColumn}>
              {t.arsenal.item[category]}
            </th>
            {columns}
            <th scope="col" className={styles.actionColumn}>
              <span className="visually-hidden">{t.arsenal.columns.action}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {none && (
            <tr>
              <th scope="row" className={styles.nameCell}>
                {none.label}
              </th>
              <td colSpan={columns.length} className={styles.noneNote}>
                {none.note}
              </td>
              <td className={styles.actionCell}>
                <button type="button" className={styles.action} onClick={none.onPick}>
                  {t.arsenal.takeOff}
                </button>
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <CrashBoundary
              key={row.id}
              fallback={(crash) => (
                <tr>
                  <td colSpan={columns.length + 2}>
                    <BrokenItemRow row={row} crash={crash} className={styles.brokenRow} />
                  </td>
                </tr>
              )}
            >
              <TableRow row={row} query={query} shields={category === 'shields'} select={select} />
            </CrashBoundary>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TableRow({
  row,
  query,
  shields,
  select,
}: {
  readonly row: AnyRow
  readonly query: string
  readonly shields: boolean
  readonly select: Select
}) {
  const t = useT()
  const language = useLanguage()
  const name = nameOf(row)[language]
  const state = stateOf(row)
  // Your power is equipped too.
  const carries = 'effect' in row && row.effect.kind !== 'power'
  return (
    <tr className={owns(state) ? styles.owned : undefined}>
      <th scope="row" className={styles.nameCell}>
        <Highlighted text={name} query={query} />
        {state && <Tag owned={owns(state)}>{t.arsenal[state]}</Tag>}
      </th>
      {'blocker' in row ? (
        <BlockerCells row={row} shields={shields} />
      ) : 'piece' in row ? (
        <PieceCells row={row} />
      ) : (
        <EffectCells row={row} />
      )}
      <td className={styles.actionCell}>
        {state !== null && owns(state) ? (
          <span className={styles.ownedAction}>
            <CheckIcon size={16} strokeWidth={2} />
            {t.arsenal[state]}
          </span>
        ) : select.kind === 'open' ? (
          <RouteLink
            to={select.to(row.id)}
            aria-label={carries ? t.arsenal.carryLabel(name) : t.arsenal.equipLabel(name)}
            className={styles.action}
          >
            {carries ? t.arsenal.carry : t.arsenal.equip}
          </RouteLink>
        ) : (
          <button
            type="button"
            aria-label={t.arsenal.chooseLabel(name)}
            className={styles.action}
            onClick={() => {
              select.onPick(row.id)
            }}
          >
            {t.arsenal.choose}
          </button>
        )}
      </td>
    </tr>
  )
}

function BlockerCells({ row, shields }: { readonly row: BlockerRow; readonly shields: boolean }) {
  const text = useBlockerText(row)
  return (
    <>
      {shields && <td className={styles.typeCell}>{text.type}</td>}
      <td className={styles.powerCell}>{text.power}</td>
      <td
        className={`${styles.numberCell ?? ''} ${row.parry === null ? (styles.faint ?? '') : ''}`}
      >
        {text.parry} <span className={styles.cellNote}>{text.parryNote}</span>
      </td>
    </>
  )
}

function PieceCells({ row }: { readonly row: PieceRow }) {
  const t = useT()
  const text = usePieceText(row)
  const chips = <Chips modifiers={row.piece.modifiers} />
  return (
    <>
      <td className={styles.powerCell}>{text.armor}</td>
      <td className={styles.numberCell}>{text.perLevel}</td>
      <td className={styles.listCell}>
        {Object.keys(row.piece.modifiers).length > 0 ? (
          chips
        ) : (
          <span className={styles.faint}>—</span>
        )}
        {text.dodge && <span className={styles.line}>{text.dodge}</span>}
      </td>
      <td className={styles.listCell}>
        {text.set ? (
          <>
            {text.set.name}{' '}
            <span className={styles.faint}>· {t.arsenal.setSize(text.set.size)}</span>
            <span className={styles.line}>{capitalised(text.set.changes)}</span>
          </>
        ) : (
          <span className={styles.faint}>—</span>
        )}
      </td>
    </>
  )
}

function EffectCells({ row }: { readonly row: EffectRow }) {
  const text = useEffectText(row.effect)
  return (
    <>
      <td className={styles.monoCell}>{text.duration}</td>
      {row.effect.kind !== 'consumable' && <td className={styles.monoCell}>{text.column}</td>}
      <td className={styles.listCell}>
        <span className={styles.changes}>
          {text.changes.map((change) => (
            <span key={change}>{change}</span>
          ))}
        </span>
      </td>
    </>
  )
}
