import type { ArmorPiece, Blocker, Effect } from '@/combat/block'
import type { DamageModifier, DamageModifiers } from '@/combat/modifiers'
import type { DamageType, Damages } from '@/combat/damage'
import type { HitScaling } from '@/combat/hit'
import type { OverTimeRules } from '@/combat/overTime'
import type { Difficulty } from '@/combat/world'

/** A name as the game shows it in French and in English. */
export interface Localized {
  readonly fr: string
  readonly en: string
}

export type BiomeId =
  | 'meadows'
  | 'blackForest'
  | 'swamp'
  | 'mountain'
  | 'plains'
  | 'mistlands'
  | 'ashlands'
  | 'deepNorth'
  | 'ocean'

/** Tool damage: it never hurts the player, but some creatures take it. */
export type ToolType = 'chop' | 'pickaxe'

/** Tool damage a creature does not ignore, and how it takes it. */
export type ToolModifiers = Partial<Record<ToolType, DamageModifier>>

/** One hit of an attack, as listed before world and stars, at its most: the game multiplies a hit the
 * attack builds (scaling 'attack') by a random 0.866 to 1, and a melee swing that touches several
 * objects shares its damage between them. */
export interface GameHit {
  readonly damages: Damages
  /** Generic damage: no block, armour or resistance stops it, and only stars scale it. */
  readonly trueDamage?: number
  /** Chop and pickaxe: no player takes them, but a Magic barrier counts them. */
  readonly toolDamage?: number
  readonly staggerMultiplier: number
  readonly blockable: boolean
  readonly dodgeable: boolean
  readonly scaling: HitScaling
  /** What deals it: the attack itself, a projectile it fires, an area, or something thrown that hits
   * on impact (at full speed). */
  readonly source: 'weapon' | 'projectile' | 'aoe' | 'impact'
  /** Of an area, in metres. */
  readonly radius?: number
  /** Instances of this hit one use of the attack spreads, at most; one when missing. */
  readonly count?: number
  /** Instances at least, when the game draws their number. */
  readonly countMin?: number
  /** The volley is fired `count` times, `every` seconds apart. */
  readonly bursts?: { readonly count: number; readonly every: number }
  /** An area that hits the same target again every `every` s, `max` times at most, after `delay` s. */
  readonly ticks?: { readonly every: number; readonly max?: number; readonly delay?: number }
  /** Chance of each instance. */
  readonly chance?: number
  /** Only where the projectile lands when it does not hit you directly: a landing beside you can both
   * splash you (radius) and leave it. */
  readonly afterMiss?: boolean
  /** Dealt by the creature's death, which this attack causes. */
  readonly onDeath?: boolean
}

export type AttackKind = 'melee' | 'area' | 'projectile' | 'summon'

/** Creatures an attack calls in, at most `max` of them per use. */
export interface GameSummon {
  readonly id: string
  readonly name?: Localized
  readonly min: number
  readonly max: number
  readonly chance?: number
  readonly afterMiss?: boolean
  /** Dropped on death: its number doubles with each star of the creature that drops it. */
  readonly doublesPerStar?: boolean
}

/** When the creature's AI picks the attack; only what differs from the game's defaults is listed
 * (range 2 m, cooldown 2 s, at any health, flying, walking or swimming). */
export interface AttackAi {
  readonly range?: number
  readonly rangeMin?: number
  readonly cooldown?: number
  readonly flying?: boolean
  readonly walking?: boolean
  readonly swimming?: boolean
  readonly dungeonOnly?: boolean
  readonly mistOnly?: boolean
  readonly prioritized?: boolean
  /** Share of its health between which it uses the attack. */
  readonly health?: readonly [number, number]
}

export interface GameAttack {
  /** Item prefabs behind this attack; identical ones are merged. */
  readonly ids: readonly string[]
  readonly name: Localized
  readonly kind: AttackKind
  /** Empty for a summon that deals nothing itself. */
  readonly hits: readonly GameHit[]
  readonly summons?: readonly GameSummon[]
  /** The attack kills the creature (an explosion, a shadow that strikes once). */
  readonly killsSelf?: boolean
  /** Pools its projectile leaves where it hits, giving a status effect to whoever stands in them for
   * `duration` seconds. */
  readonly leaves?: readonly { readonly statusEffect: string; readonly duration?: number }[]
  readonly statusEffect?: { readonly id: string; readonly chance: number }
  readonly ai?: AttackAi
  /** Swings in a row; the last one multiplies the damage. */
  readonly chain?: { readonly length: number; readonly lastMultiplier: number }
  /** When the animation strikes more than once: every hit lands at each of these times (s), the later
   * ones about 0.15 s later per earlier melee strike that touched something (the attacker freezes). */
  readonly strikes?: { readonly count: number; readonly times: readonly number[] }
}

/** A collider whose modifiers replace the creature's own. `part` is its name in the game, `name` the
 * body part's, from curation.json: the game names none. */
export interface GameWeakSpot {
  readonly part: string
  readonly name: Localized
  readonly modifiers: DamageModifiers
  readonly toolModifiers?: ToolModifiers
}

/** Where a creature appears under a condition: a raid, a boss killed, an event, a summon… */
export interface GameAppearance {
  readonly source: string
  readonly biomes: readonly BiomeId[]
}

/** Hits of a creature that runs into you faster than `minSpeed` (m/s). */
export interface GameTrample {
  readonly minSpeed: number
  readonly hits: readonly GameHit[]
}

/** What fighting a creature, or one phase of a boss, takes. */
export interface GameFighter {
  readonly health: number
  readonly staggerFactor: number
  /** Whether its animator can play a stagger at all. */
  readonly staggerable: boolean
  /** Whether a parry staggers it. */
  readonly staggeredByParry: boolean
  /** Only the damage types it does not take normally. */
  readonly modifiers: DamageModifiers
  readonly toolModifiers?: ToolModifiers
  readonly weakSpots?: readonly GameWeakSpot[]
  readonly attacks: readonly GameAttack[]
  readonly trample?: GameTrample
  /** What its death deals around it. */
  readonly onDeath?: readonly GameHit[]
  /** Creatures its death brings: summoned (Kall's aspects) or dropped alive (an Oozer's blobs). */
  readonly deathSummons?: readonly GameSummon[]
}

/** A later phase of a boss: the creature the previous phase's death spawns. A phase immune to every
 * player damage type is not fought: what the previous phase's death brings ends it (each of Kall's
 * aspects deals it 1000 non-player damage as it dies). */
export interface GamePhase extends GameFighter {
  readonly id: string
}

export interface GameCreature extends GameFighter {
  readonly id: string
  readonly name: Localized
  /** The biome it comes from, when a biome lists it beside another the game names alike (curation). */
  readonly origin?: BiomeId
  readonly boss: boolean
  /** Where it lives; where it appears only under a condition when it lives nowhere. */
  readonly biomes: readonly BiomeId[]
  readonly conditional?: readonly GameAppearance[]
  /** Stars it can have where it lives. */
  readonly stars: { readonly min: number; readonly max: number }
  /** Its level when the game always gives it the same one. */
  readonly level?: number
  /** Its next phases, in order; the fields above are its first one's. */
  readonly phases?: readonly GamePhase[]
}

export type BlockerGroup = 'round' | 'buckler' | 'tower' | 'weapon' | 'other' | 'unarmed'

/** How the player gets the item; null for bare hands. */
export type Obtain = 'craft' | 'upgradeOnly' | 'trader' | 'world' | 'dlc'

export interface GameBlocker extends Blocker {
  readonly id: string
  readonly name: Localized
  readonly group: BlockerGroup
  readonly maxQuality: number
  readonly deflectionForce: number
  readonly deflectionForcePerLevel: number
  readonly movementModifier: number
  readonly perfectBlockStaminaRegen: number
  readonly modifiers: DamageModifiers
  /** Whether a station upgrades it up to maxQuality. */
  readonly upgradable: boolean
  /** The Forge of Potential takes it past maxQuality for this idol (item id) per level. */
  readonly forge: { readonly idol: string } | null
  readonly obtain: Obtain | null
  /** Used up by its attack (bombs). */
  readonly consumable: boolean
}

export type ArmorSlot = 'helmet' | 'chest' | 'legs' | 'cape'

/** A helmet, chest, legs or cape the player can get: the only items whose armor and modifiers count. */
export interface GameArmorPiece extends Omit<ArmorPiece, 'level'> {
  readonly id: string
  readonly name: Localized
  readonly slot: ArmorSlot
  readonly maxQuality: number
  /** Only the damage types it changes. */
  readonly modifiers: DamageModifiers
  /** Share it adds to what a dodge costs in stamina. */
  readonly dodgeStaminaModifier?: number
  /** The set it belongs to, when wearing it whole brings an effect (`set` of a rule effect). */
  readonly set?: string
  readonly upgradable: boolean
  readonly forge: { readonly idol: string } | null
  readonly obtain: Obtain
}

export interface GameStatusEffect {
  readonly name: Localized
  /** Seconds. */
  readonly ttl: number
  /** Share of the base speed added on land (-0.5: half speed); half of it while swimming. */
  readonly speedModifier: number
  readonly modifiers: DamageModifiers
}

/** A setting of the game's « Combat » world modifier. */
export interface GameWorldPreset {
  readonly id: Difficulty
  readonly name: Localized
  readonly enemyDamage: number
  readonly playerDamage: number
  /** Multiplies the chance of a star (SpawnSystem.GetLevelUpChance). */
  readonly levelUpRate: number
  /** Multiplies a creature's size and its walk and run speed, outside dungeons (Character.Awake,
   * Character.UpdateWalking); never its animations. */
  readonly enemySpeedSize: number
  /** The world presets of the start screen that pick this setting under another name (Hardcore picks
   * Very hard). */
  readonly worldPresets: readonly Localized[]
}

/** Where the player gets an effect that changes the rules. */
export type RuleEffectKind = 'power' | 'consumable' | 'trinket' | 'set' | 'equipment'

/** A guardian power, even one that changes no hit, or a drink, a trinket, a set or an item worn that
 * changes a fight: what it changes, as the engine takes it, each change given only when it is not
 * neutral. */
export interface GameRuleEffect extends Effect {
  /** The status effect's asset name. */
  readonly id: string
  readonly name: Localized
  readonly kind: RuleEffectKind
  /** The drinks, trinkets or items worn that give it. */
  readonly items?: readonly string[]
  /** A trinket's: the adrenaline at which it starts. */
  readonly adrenaline?: number
  /** A set's: its name in the game data, and how many of its pieces it takes. */
  readonly set?: { readonly id: string; readonly size: number }
  /** Seconds; left out when it lasts as long as what is worn. */
  readonly ttl?: number
  /** Seconds before a guardian power can be used again. */
  readonly cooldown?: number
  /** Share added to what a dodge costs in stamina. */
  readonly dodgeStaminaModifier?: number
}

export interface GameData {
  readonly game: { readonly version: string | null; readonly build: number }
  readonly world: {
    readonly damageScalePerPlayer: number
    readonly healthScalePerPlayer: number
    readonly maxPlayers: number
    /** Metres within which players count. */
    readonly range: number
    readonly presets: readonly GameWorldPreset[]
  }
  readonly player: {
    readonly modifiers: DamageModifiers
    readonly blockStaminaDrain: number
    readonly perfectBlockStaminaDrain: number
    readonly staggerFactor: number
    readonly dodgeStamina: number
    /** Share of the dodge stamina a perfect dodge gives back. */
    readonly perfectDodgeRefund: number
    /** How burning, spirit and poison deal what a hit leaves the player (SE_Burning, SE_Poison). */
    readonly overTime: OverTimeRules
  }
  /** The cold that wears the player down where the weather freezes, away from fire and shelter, unless
   * they resist frost (Player.UpdateEnvStatusEffects). */
  readonly freezing: {
    readonly name: Localized
    /** Generic damage: neither armor nor resistance lowers it. */
    readonly damagePerSecond: number
    /** Multiplies the health regeneration meanwhile. */
    readonly healthRegen: number
    readonly biomes: readonly BiomeId[]
  }
  /** Wet (SE_Wet), in the rain or in water: its resistances merge like an effect's, it burns the shorter,
   * and it lasts `ttl` s once out of the rain. `biomes`: where it rains. */
  readonly wet: {
    readonly name: Localized
    readonly ttl: number
    readonly modifiers: DamageModifiers
    readonly biomes: readonly BiomeId[]
  }
  /** The Magic barrier (SE_Shield) the `staff` casts on its caster and the players around: it absorbs
   * `absorb` + `absorbPerSkill` × the caster's `skill`, for `ttlPerLevel` s × the staff's level. */
  readonly barrier: {
    readonly name: Localized
    readonly staff: Localized
    readonly skill: Localized
    readonly absorb: number
    readonly absorbPerSkill: number
    readonly ttlPerLevel: number
    readonly maxLevel: number
    /** Metres around the caster it covers. */
    readonly radius: number
  }
  readonly biomes: readonly { readonly id: BiomeId; readonly name: Localized }[]
  readonly damageTypes: Readonly<Record<DamageType, Localized>>
  readonly toolTypes: Readonly<Record<ToolType, Localized>>
  readonly modifiers: Readonly<Record<Exclude<DamageModifier, 'normal' | 'ignore'>, Localized>>
  readonly statusEffects: Readonly<Record<string, GameStatusEffect>>
  readonly creatures: readonly GameCreature[]
  readonly blockers: readonly GameBlocker[]
  readonly armorPieces: readonly GameArmorPiece[]
  /** The station that upgrades an item past its maxQuality; null when no world has one. */
  readonly forge: { readonly name: Localized } | null
  readonly ruleEffects: readonly GameRuleEffect[]
}
