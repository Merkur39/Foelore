import { blockPower, parryPower } from '@/combat/block'
import { game } from '@/data'
import type {
  ArmorSlot,
  GameArmorPiece,
  GameBlocker,
  GameRuleEffect,
  Localized,
} from '@/data/types'
import { matchRange } from '@/features/bestiary/model'
import {
  carriable,
  type Carried,
  type CarriedEffect,
  type CarriedKind,
} from '@/features/gear/carried'
import { pieceArmor, type Pieces } from '@/features/gear/pieces'
import type { Language } from '@/i18n/detect'

/** The Arsenal's categories, by the three families of Your gear. */
export const FAMILIES = [
  { id: 'hand', categories: ['shields', 'weapons', 'others'] },
  { id: 'armor', categories: ['helmets', 'chests', 'legs', 'capes'] },
  { id: 'carry', categories: ['powers', 'trinkets', 'drinks'] },
] as const

export type ArsenalFamily = (typeof FAMILIES)[number]['id']
export type ArsenalCategory = (typeof FAMILIES)[number]['categories'][number]
export type BlockerCategory = (typeof FAMILIES)[0]['categories'][number]
export type PieceCategory = (typeof FAMILIES)[1]['categories'][number]
export type EffectCategory = (typeof FAMILIES)[2]['categories'][number]

export const CATEGORIES: readonly ArsenalCategory[] = FAMILIES.flatMap(
  ({ categories }) => categories,
)

export const familyOf = (category: ArsenalCategory) =>
  FAMILIES.find(({ categories }) => (categories as readonly ArsenalCategory[]).includes(category))
    ?.id ?? 'hand'

const SLOTS: Record<PieceCategory, ArmorSlot> = {
  helmets: 'helmet',
  chests: 'chest',
  legs: 'legs',
  capes: 'cape',
}
const KINDS: Record<EffectCategory, CarriedKind> = {
  powers: 'power',
  trinkets: 'trinket',
  drinks: 'consumable',
}

export const isBlockerCategory = (category: ArsenalCategory): category is BlockerCategory =>
  familyOf(category) === 'hand'
export const isPieceCategory = (category: ArsenalCategory): category is PieceCategory =>
  familyOf(category) === 'armor'

/** The tab an item is listed under; null for what its own attack uses up (bombs, snowballs), which
 * nobody holds up to block. */
export function categoryOf(blocker: GameBlocker): BlockerCategory | null {
  if (blocker.consumable) return null
  if (blocker.group === 'weapon') return 'weapons'
  if (blocker.group === 'other' || blocker.group === 'unarmed') return 'others'
  return 'shields'
}

export const SORTS = ['power', 'parry'] as const
export type ArsenalSort = (typeof SORTS)[number]

export interface BlockerRow {
  readonly id: string
  readonly blocker: GameBlocker
  readonly power: number
  /** Null when the item cannot parry. */
  readonly parry: number | null
  readonly equipped: boolean
}

/** What blocks, at level 1 and your skill: the item you hold first, then the most of what the sort
 * asks for, the block power breaking ties. Its level is picked in Your gear. */
export function blockerRows(
  category: BlockerCategory,
  {
    skill,
    equipped,
    sort,
  }: { readonly skill: number; readonly equipped: string; readonly sort: ArsenalSort },
): BlockerRow[] {
  const key = (row: BlockerRow) => (sort === 'power' ? row.power : (row.parry ?? -Infinity))
  return game.blockers
    .filter((blocker) => categoryOf(blocker) === category)
    .map((blocker) => ({
      id: blocker.id,
      blocker,
      power: blockPower(blocker, 1, skill),
      parry: parryPower(blocker, 1, skill),
      equipped: blocker.id === equipped,
    }))
    .toSorted(
      (a, b) => Number(b.equipped) - Number(a.equipped) || key(b) - key(a) || b.power - a.power,
    )
}

export interface PieceRow {
  readonly id: string
  readonly piece: GameArmorPiece
  /** At level 1. */
  readonly armor: number
  readonly perLevel: number
  /** The set it belongs to, when wearing it whole changes a fight. */
  readonly set: GameRuleEffect | null
  readonly equipped: boolean
}

/** A slot's pieces at level 1: those worn first, then the most armor, then by name. */
export function pieceRows(category: PieceCategory, worn: Pieces, language: Language = 'fr') {
  const slot = SLOTS[category]
  return game.armorPieces
    .filter((piece) => piece.slot === slot)
    .map((piece): PieceRow => ({
      id: piece.id,
      piece,
      armor: pieceArmor(piece, 1),
      perLevel: piece.armorPerLevel,
      set:
        game.ruleEffects.find(
          (effect) => effect.set !== undefined && effect.set.id === piece.set,
        ) ?? null,
      equipped: worn[slot]?.id === piece.id,
    }))
    .toSorted(
      (a, b) =>
        Number(b.equipped) - Number(a.equipped) ||
        b.armor - a.armor ||
        a.piece.name[language].localeCompare(b.piece.name[language], language),
    )
}

export interface EffectRow {
  readonly id: string
  readonly effect: CarriedEffect
  readonly carried: boolean
  /** A power the group casts on you. */
  readonly group: boolean
}

/** What one carries of a kind, in the order of Your gear: what is carried first, then the group's. */
export function effectRows(category: EffectCategory, carried: Carried): EffectRow[] {
  const ids = [carried.trinket, carried.power, ...carried.drinks]
  const rank = (row: EffectRow) => (row.carried ? 2 : row.group ? 1 : 0)
  return carriable(KINDS[category])
    .map((effect) => ({
      id: effect.id,
      effect,
      carried: ids.includes(effect.id),
      group: carried.group.includes(effect.id),
    }))
    .toSorted((a, b) => rank(b) - rank(a))
}

/** How many items a category lists. */
export function categorySize(category: ArsenalCategory): number {
  if (isBlockerCategory(category))
    return game.blockers.filter((blocker) => categoryOf(blocker) === category).length
  if (isPieceCategory(category))
    return game.armorPieces.filter((piece) => piece.slot === SLOTS[category]).length
  return carriable(KINDS[category]).length
}

/** What the Arsenal lists against: your skill, what you hold, wear and carry. */
export interface ArsenalGear {
  readonly skill: number
  readonly equipped: string
  readonly pieces: Pieces
  readonly carried: Carried
}

export type CategoryRows =
  | {
      readonly kind: 'blocker'
      readonly category: BlockerCategory
      readonly rows: readonly BlockerRow[]
    }
  | { readonly kind: 'piece'; readonly category: PieceCategory; readonly rows: readonly PieceRow[] }
  | {
      readonly kind: 'effect'
      readonly category: EffectCategory
      readonly rows: readonly EffectRow[]
    }

/** A category's rows, in its own order; what blocks sorted as asked. */
export function rowsOf(
  category: ArsenalCategory,
  gear: ArsenalGear,
  language: Language,
  sort: ArsenalSort = 'power',
): CategoryRows {
  if (isBlockerCategory(category))
    return { kind: 'blocker', category, rows: blockerRows(category, { ...gear, sort }) }
  if (isPieceCategory(category))
    return { kind: 'piece', category, rows: pieceRows(category, gear.pieces, language) }
  return { kind: 'effect', category, rows: effectRows(category, gear.carried) }
}

/** The rows of a category that `keep` keeps, by their item's id and name. */
export function keepRows(
  found: CategoryRows,
  keep: (id: string, name: Localized) => boolean,
): CategoryRows {
  switch (found.kind) {
    case 'blocker':
      return { ...found, rows: found.rows.filter((row) => keep(row.id, row.blocker.name)) }
    case 'piece':
      return { ...found, rows: found.rows.filter((row) => keep(row.id, row.piece.name)) }
    case 'effect':
      return { ...found, rows: found.rows.filter((row) => keep(row.id, row.effect.name)) }
  }
}

/** Whether a name holds the search, accents and case aside; an empty search holds every name. */
export const holds = (name: Localized, query: string, language: Language) =>
  query.trim() === '' || matchRange(name[language], query) !== null

/** The categories whose names hold the search, accents and case aside, in the order of the families,
 * each with the rows that match; nothing for an empty search. */
export function searchArsenal(
  query: string,
  language: Language,
  gear: ArsenalGear,
  sort: ArsenalSort = 'power',
): CategoryRows[] {
  if (query.trim() === '') return []
  return CATEGORIES.map((category) =>
    keepRows(rowsOf(category, gear, language, sort), (_, name) => holds(name, query, language)),
  ).filter(({ rows }) => rows.length > 0)
}
