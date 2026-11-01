import { mergeModifiers, type DamageModifiers } from './modifiers'
import type { OverTimeRules } from './overTime'

/** What an item brings to a block, as the game data lists it. */
export interface Blocker {
  readonly blockPower: number
  readonly blockPowerPerLevel: number
  /** Multiplies the block power on a parry; an item parries only when it is above 1. */
  readonly timedBlockBonus: number
  /** Applied to every hit it blocks (Humanoid.BlockAttack); only the Serpent Scale shield has one. */
  readonly modifiers?: DamageModifiers
  /** Stamina a successful parry gives back (m_perfectBlockStaminaRegen). */
  readonly perfectBlockStaminaRegen?: number
}

/** The player's own rules, as the game data lists them (the Player prefab). */
export interface PlayerRules {
  /** Spirit immune. */
  readonly modifiers: DamageModifiers
  /** Share of max health the stagger bar holds (m_staggerDamageFactor). */
  readonly staggerFactor: number
  /** What a block costs in stamina when it uses its whole power (m_blockStaminaDrain). */
  readonly blockStaminaDrain: number
  /** What a parry costs in stamina (m_perfectBlockStaminaDrain). */
  readonly perfectBlockStaminaDrain: number
  /** How burning, spirit and poison deal what a hit leaves them. */
  readonly overTime: OverTimeRules
}

/** A helmet, chest, legs or cape worn, at its level, with what the game data lists for it. */
export interface ArmorPiece {
  readonly armor: number
  readonly armorPerLevel: number
  readonly level: number
  readonly modifiers?: DamageModifiers
  /** Share it adds to what a guard costs in stamina (m_blockStaminaModifier): the Ashen Cape's −0.2. */
  readonly blockStaminaModifier?: number
}

/** What an active status effect changes in a fight (SE_Stats); each value is neutral when left out. */
export interface Effect {
  readonly modifiers?: DamageModifiers
  /** Added to the armor (m_addArmor)… */
  readonly addArmor?: number
  /** …which then grows by this share (m_armorMultiplier). */
  readonly armorMultiplier?: number
  /** Share added to the stagger taken (m_staggerModifier): Fader's power halves it with −0.5. */
  readonly staggerModifier?: number
  /** Share added to the parry power, after the item's bonus (m_timedBlockBonus). */
  readonly parryBonus?: number
  /** Share added to what a guard costs in stamina (m_blockStaminaUseModifier)… */
  readonly blockStaminaModifier?: number
  /** …then a flat amount: below zero, the guard gives stamina back (m_blockStaminaUseFlatValue). */
  readonly blockStaminaFlat?: number
}

export interface Profile {
  readonly player: PlayerRules
  readonly blocker: Blocker
  readonly level: number
  /** Blocking skill, 0 to 100. */
  readonly skill: number
  /** Typed by the player; the pieces' armor adds up to it. */
  readonly armor: number
  readonly maxHealth: number
  /** In the game's order: chest, legs, helmet, cape. */
  readonly pieces?: readonly ArmorPiece[]
  /** In the order they came. */
  readonly effects?: readonly Effect[]
}

/** The values a hit is resolved against. */
export interface Defence {
  readonly blockPower: number
  /** Null when the item cannot parry. */
  readonly parryPower: number | null
  readonly armor: number
  readonly maxHealth: number
  readonly staggerFactor: number
  readonly blockStaminaDrain: number
  readonly parryStaminaDrain: number
  readonly overTime: OverTimeRules
  /** The player's, the pieces' and the effects', applied past the guard and before the armor
   * (Character.RPC_Damage). */
  readonly modifiers?: DamageModifiers
  /** The blocker's, applied to the hit before the block, and kept when the block breaks. */
  readonly blockerModifiers?: DamageModifiers
  readonly parryStaminaRegen?: number
  /** The effects' stagger modifiers, added up. */
  readonly staggerModifier?: number
  /** The pieces' share of a guard's stamina (Player.GetEquipmentBlockStaminaModifier)… */
  readonly blockStaminaGear?: number
  /** …then the effects' share of that, and their flat amount (SEMan.ModifyBlockStaminaUsage). */
  readonly blockStaminaEffects?: number
  readonly blockStaminaFlat?: number
}

// ItemDrop.ItemData.GetBlockPower: the skill adds up to half of the base value.
export function blockPower(blocker: Blocker, level: number, skill: number): number {
  const base = blocker.blockPower + (level - 1) * blocker.blockPowerPerLevel
  return base + base * (skill / 100) * 0.5
}

export function parryPower(blocker: Blocker, level: number, skill: number): number | null {
  if (blocker.timedBlockBonus <= 1) return null
  return blockPower(blocker, level, skill) * blocker.timedBlockBonus
}

const sumOf = <T>(items: readonly T[], value: (item: T) => number | undefined) =>
  items.reduce((sum, item) => sum + (value(item) ?? 0), 0)

// Player.GetBodyArmor: the pieces' armor at their level (ItemData.GetArmor), then each effect adds its
// own and grows the total (SE_Stats.ModifyArmorMods).
function bodyArmor(typed: number, pieces: readonly ArmorPiece[], effects: readonly Effect[]) {
  const worn =
    typed + sumOf(pieces, (piece) => piece.armor + (piece.level - 1) * piece.armorPerLevel)
  return effects.reduce(
    (armor, effect) => (armor + (effect.addArmor ?? 0)) * (1 + (effect.armorMultiplier ?? 0)),
    worn,
  )
}

export function defenceOf({
  player,
  blocker,
  level,
  skill,
  armor,
  maxHealth,
  pieces = [],
  effects = [],
}: Profile): Defence {
  const parry = parryPower(blocker, level, skill)
  return {
    blockPower: blockPower(blocker, level, skill),
    // SEMan.ModifyTimedBlockBonus, after the item's bonus.
    parryPower:
      parry === null
        ? null
        : effects.reduce((power, effect) => power * (1 + (effect.parryBonus ?? 0)), parry),
    armor: bodyArmor(armor, pieces, effects),
    maxHealth,
    staggerFactor: player.staggerFactor,
    blockStaminaDrain: player.blockStaminaDrain,
    parryStaminaDrain: player.perfectBlockStaminaDrain,
    overTime: player.overTime,
    // Character.GetDamageModifiers.
    modifiers: mergeModifiers(
      player.modifiers,
      ...pieces.map((piece) => piece.modifiers ?? {}),
      ...effects.map((effect) => effect.modifiers ?? {}),
    ),
    blockerModifiers: blocker.modifiers ?? {},
    parryStaminaRegen: blocker.perfectBlockStaminaRegen ?? 0,
    staggerModifier: sumOf(effects, (effect) => effect.staggerModifier),
    blockStaminaGear: sumOf(pieces, (piece) => piece.blockStaminaModifier),
    blockStaminaEffects: sumOf(effects, (effect) => effect.blockStaminaModifier),
    blockStaminaFlat: sumOf(effects, (effect) => effect.blockStaminaFlat),
  }
}
