import type { World } from '@/combat/world'
import { game } from '@/data'
import type { ArmorSlot, BiomeId } from '@/data/types'
import { NOTHING_CARRIED, type Carried, type CarriedKind } from '@/features/gear/carried'
import { maxLevel } from '@/features/gear/model'
import { SLOTS, type Pieces, type Worn } from '@/features/gear/pieces'
import { LANGUAGES } from '@/i18n/detect'

/** The seven palettes of src/styles/themes.css, applied through data-theme on the root. */
export const THEMES = [
  'origine',
  'braise',
  'brume',
  'jour',
  'runes',
  'graphite',
  'parchemin',
] as const
export type Theme = (typeof THEMES)[number]

const LANGUAGE_SETTINGS = ['auto', ...LANGUAGES] as const
/** Automatic follows the device's languages. */
export type LanguageSetting = (typeof LANGUAGE_SETTINGS)[number]

/** « Ton équipement »: what the verdicts are worked out with; `blocker` is an item id of the game data. */
export interface Gear {
  readonly blocker: string
  readonly level: number
  /** Blocking skill, 0 to 100. */
  readonly skill: number
  /** Typed in an earlier version, before the pieces: it stands until the player picks one. */
  readonly armor: number
  readonly maxHealth: number
  /** Left out by players of earlier versions, whose typed armor stands for them. */
  readonly pieces?: Pieces
  /** Left out by players of earlier versions, who carry nothing. */
  readonly carried?: Carried
}

/** An attack, by the creature or boss phase that makes it and its first item id. */
export interface AttackRef {
  readonly fighter: string
  readonly attack: string
}

export interface AppState {
  readonly gear: Gear
  readonly world: World
  readonly theme: Theme
  readonly language: LanguageSetting
  /** Most recent first. */
  readonly recentAttacks: readonly AttackRef[]
  /** The version the app ran last on this device: after an update, what it fixed is told once. Null
   * before the first launch. */
  readonly seenVersion: string | null
  /** The app offered to install itself, once, on a browser that can: the offer stays in Settings. */
  readonly installOffered: boolean
  /** The biome the player last picked in the Bestiary, where it opens when the address names none.
   * Null before the first pick. */
  readonly biome: BiomeId | null
  /** The questions of the first arrival (the biome, the gear, the world) were answered or skipped:
   * asked once, of players of earlier versions too. */
  readonly onboarding: boolean
}

/** A new character's gear: bare hands, nothing worn, verdicts too harsh until it is set, never too kind. */
export const DEFAULT_STATE: AppState = {
  gear: {
    blocker: 'PlayerUnarmed',
    level: 1,
    skill: 0,
    armor: 0,
    maxHealth: 25,
    pieces: {},
    carried: NOTHING_CARRIED,
  },
  world: { difficulty: 'normal', players: 1 },
  theme: 'origine',
  language: 'auto',
  recentAttacks: [],
  seenVersion: null,
  installOffered: false,
  biome: null,
  onboarding: false,
}

export const STORAGE_KEY = 'foelore'

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

export interface Store {
  readonly getState: () => AppState
  readonly subscribe: (listener: () => void) => () => void
  readonly update: (change: Partial<AppState>) => void
}

/** The app state, saved on the device. Without storage, or with one that refuses it, the state still
 * holds for the session; a saved setting the app cannot use (another version, a game update that
 * removed an item) falls back to its default, the others are kept. */
export function createStore(storage: KeyValueStorage | null): Store {
  let state = load(storage)
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    update: (change) => {
      state = { ...state, ...change }
      try {
        storage?.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Storage full or blocked: the change holds until the app is closed.
      }
      for (const listener of listeners) listener()
    },
  }
}

/** localStorage, or null where even reaching it throws (site data blocked). */
export function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function load(storage: KeyValueStorage | null): AppState {
  let saved: unknown
  try {
    saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return DEFAULT_STATE
  }
  if (!isRecord(saved)) return DEFAULT_STATE
  return {
    gear: isGear(saved.gear) ? withCarried(withPieces(saved.gear)) : DEFAULT_STATE.gear,
    world: isWorld(saved.world) ? saved.world : DEFAULT_STATE.world,
    theme: oneOf(THEMES, saved.theme) ?? DEFAULT_STATE.theme,
    language: oneOf(LANGUAGE_SETTINGS, saved.language) ?? DEFAULT_STATE.language,
    recentAttacks: isAttackRefs(saved.recentAttacks) ? saved.recentAttacks : [],
    seenVersion:
      typeof saved.seenVersion === 'string' && /^\d+\.\d+\.\d+$/.test(saved.seenVersion)
        ? saved.seenVersion
        : null,
    installOffered: saved.installOffered === true,
    biome:
      oneOf(
        game.biomes.map((biome) => biome.id),
        saved.biome,
      ) ?? null,
    onboarding: saved.onboarding === true,
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isNumber = (value: unknown, min: number, max = Infinity): value is number =>
  typeof value === 'number' && value >= min && value <= max

const oneOf = <T extends string>(values: readonly T[], value: unknown): T | undefined =>
  values.find((option) => option === value)

function isGear(value: unknown): value is Gear {
  if (!isRecord(value)) return false
  const blocker = game.blockers.find((candidate) => candidate.id === value.blocker)
  return (
    blocker !== undefined &&
    Number.isInteger(value.level) &&
    isNumber(value.level, 1, maxLevel(blocker)) &&
    isNumber(value.skill, 0, 100) &&
    isNumber(value.armor, 0) &&
    isNumber(value.maxHealth, 1)
  )
}

// The pieces are checked one by one: a piece the game no longer has, or out of its slot, is dropped,
// a level clamped, and the rest of the gear kept; pieces that are no pieces leave the typed armor.
function withPieces({ pieces, ...gear }: Gear): Gear {
  if (!isRecord(pieces)) return gear
  const kept: Partial<Record<ArmorSlot, Worn>> = {}
  for (const slot of SLOTS) {
    const worn = pieces[slot]
    if (!isRecord(worn) || typeof worn.level !== 'number' || !Number.isFinite(worn.level)) continue
    const piece = game.armorPieces.find(
      (candidate) => candidate.id === worn.id && candidate.slot === slot,
    )
    if (!piece) continue
    kept[slot] = {
      id: piece.id,
      level: Math.min(Math.max(Math.round(worn.level), 1), maxLevel(piece)),
    }
  }
  return { ...gear, pieces: kept }
}

// What is carried is checked one by one too: an effect the game no longer has, or of another kind, is
// dropped, a drink kept once, a group's power once and never one's own (players of earlier versions have
// none), a barrier by a whole Blood Magic of 0 to 100; what is no record of it at all carries nothing.
function withCarried({ carried, ...gear }: Gear): Gear {
  if (!isRecord(carried)) return gear
  const effectId = (kind: CarriedKind, value: unknown) =>
    game.ruleEffects.find((effect) => effect.kind === kind && effect.id === value)?.id ?? null
  const listed = (value: unknown, kind: CarriedKind) => [
    ...new Set(
      (Array.isArray(value) ? (value as unknown[]) : []).flatMap(
        (item) => effectId(kind, item) ?? [],
      ),
    ),
  ]
  const power = effectId('power', carried.power)
  const kept: Carried = {
    trinket: effectId('trinket', carried.trinket),
    power,
    drinks: listed(carried.drinks, 'consumable'),
    group: listed(carried.group, 'power').filter((id) => id !== power),
    ...(Number.isInteger(carried.barrier) && isNumber(carried.barrier, 0, 100)
      ? { barrier: carried.barrier }
      : {}),
  }
  return { ...gear, carried: kept }
}

const isWorld = (value: unknown): value is World =>
  isRecord(value) &&
  game.world.presets.some((preset) => preset.id === value.difficulty) &&
  Number.isInteger(value.players) &&
  isNumber(value.players, 1, game.world.maxPlayers)

const isAttackRefs = (value: unknown): value is AttackRef[] =>
  Array.isArray(value) &&
  value.every(
    (ref) => isRecord(ref) && typeof ref.fighter === 'string' && typeof ref.attack === 'string',
  )
