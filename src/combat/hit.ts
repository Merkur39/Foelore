import { applyArmorTo } from './armor'
import type { Defence } from './block'
import { MIN_DAMAGE, scaleDamages, staggerDamage, totalDamage, type Damages } from './damage'
import { applyModifiers } from './modifiers'
import { burning, poisoning, type OverTime } from './overTime'
import { worldScale, type World } from './world'

/**
 * What scales a hit before it lands:
 * - attack: the hit the attack builds, scaled by the world and the stars (Attack.ModifyDamage);
 * - world: a projectile or area with its own damage and the creature as owner: the world only;
 * - none: an area with no owner (spawned by an ability, a death): neither (Character.RPC_Damage).
 */
export type HitScaling = 'attack' | 'world' | 'none'

/** A monster attack, as the game data lists it (before world and stars). */
export interface Hit {
  readonly damages: Damages
  /** Weighs on the stagger of what passes the armor (Attack.m_staggerMultiplier). */
  readonly staggerMultiplier: number
  readonly blockable: boolean
  /** The attack's own hit when left out. */
  readonly scaling?: HitScaling
  /** Generic damage (DamageTypes.m_damage): no guard, resistance, armor or stagger; scaled by stars only. */
  readonly trueDamage?: number
}

export type Guard = 'block' | 'parry'

export interface HitOptions {
  readonly guard: Guard
  readonly stars: number
  /** Share of the stagger bar already filled before the hit, from 0 to 1. */
  readonly barBefore: number
  /** The game's roll on a hit an attack builds, from LOWEST_ROLL to 1; its top when left out. */
  readonly roll?: number
}

/** Character.GetRandomSkillFactor: every hit an attack builds is multiplied by √U(0.75, 1). */
export const LOWEST_ROLL = Math.sqrt(0.75)

/**
 * - holds: blocked, no stagger;
 * - staggered: blocked, but what passes fills the bar;
 * - broken: what passes the shield fills the bar, the block is cancelled;
 * - unblockable: the attack cannot be blocked at all.
 */
export type Verdict = 'holds' | 'staggered' | 'broken' | 'unblockable'

export interface StaggerBar {
  readonly before: number
  /** What passes the shield, counted once at the block (Humanoid.BlockAttack)… */
  readonly shield: number
  /** …then what passes the armor, counted again when the damage lands (Character.ApplyDamage). */
  readonly armor: number
  readonly limit: number
}

export interface HitResult {
  readonly verdict: Verdict
  readonly staggered: boolean
  /** The hit after world, stars and roll, before shield and armor. */
  readonly received: number
  /** All the hit deals: what lands at once, then what burns, poisons and haunts. */
  readonly taken: number
  /** What lands at once: the number the game shows on the hit. */
  readonly direct: number
  /** What the status effects deal of `taken` over time; null when none of that type passes the armor. */
  readonly burning: OverTime | null
  readonly poison: OverTime | null
  readonly spirit: OverTime | null
  /** Stamina spent; negative when the parry gives some back. */
  readonly stamina: number
  readonly bar: StaggerBar
}

// Attack.GetLevelDamageFactor: each star adds half of the damage.
const DAMAGE_PER_STAR = 0.5

function verdictOf(blockable: boolean, broken: boolean, staggered: boolean): Verdict {
  if (!blockable) return 'unblockable'
  if (broken) return 'broken'
  return staggered ? 'staggered' : 'holds'
}

/** [typed damage factor, true damage factor]: the world never scales true damage (HitData.ApplyModifier); the
 * roll scales both (Attack.ModifyDamage). */
function scalingOf(
  scaling: HitScaling,
  world: World,
  stars: number,
  roll: number,
): [number, number] {
  const starFactor = (1 + stars * DAMAGE_PER_STAR) * roll
  if (scaling === 'attack') return [worldScale(world).enemy * starFactor, starFactor]
  if (scaling === 'world') return [worldScale(world).enemy, 1]
  return [1, 1]
}

/**
 * Humanoid.BlockAttack: a block costs the player's drain in proportion to the power it uses, a parry
 * its own drain; the pieces add their share, then each effect its share of that and a flat amount,
 * and a total below zero gives stamina back (SEMan.ModifyBlockStaminaUsage). A parry that holds then
 * gives the item's refund, or else charges its drain once more, the pieces' share taken off this time.
 */
function guardStamina(defence: Defence, guard: Guard, used: number, broken: boolean): number {
  const gear = defence.blockStaminaGear ?? 0
  const cost = (drain: number, gearShare: number) => {
    const withGear = drain + drain * gearShare
    return (
      withGear + withGear * (defence.blockStaminaEffects ?? 0) + (defence.blockStaminaFlat ?? 0)
    )
  }
  if (guard === 'block') return cost(defence.blockStaminaDrain * used, gear)
  const parried = cost(defence.parryStaminaDrain, gear)
  if (broken) return parried
  const refund = defence.parryStaminaRegen ?? 0
  return refund > 0 ? parried - refund : parried + cost(defence.parryStaminaDrain, -gear)
}

/** The hit as the game lists it at these stars, before the world: what the interface shows. */
export function listedDamage(hit: Hit, stars: number): number {
  const starFactor = (hit.scaling ?? 'attack') === 'attack' ? 1 + stars * DAMAGE_PER_STAR : 1
  return (totalDamage(hit.damages) + (hit.trueDamage ?? 0)) * starFactor
}

/** Resolves a hit against a block or a parry; null when the item cannot parry. */
export function resolveHit(
  defence: Defence,
  hit: Hit,
  world: World,
  { guard, stars, barBefore, roll = 1 }: HitOptions,
): HitResult | null {
  const power = guard === 'parry' ? defence.parryPower : defence.blockPower
  if (power === null) return null

  const [typedFactor, trueFactor] = scalingOf(hit.scaling ?? 'attack', world, stars, roll)
  let damages = scaleDamages(hit.damages, typedFactor)
  const trueDamage = (hit.trueDamage ?? 0) * trueFactor
  const received = totalDamage(damages) + trueDamage
  const limit = defence.staggerFactor * defence.maxHealth
  const before = barBefore * limit
  // Character.AddStaggerDamage: each effect adds its share of the stagger, at the shield and at the armor.
  const staggerShare = 1 + (defence.staggerModifier ?? 0)

  let shield = 0
  let stamina = 0
  let broken = false
  if (hit.blockable) {
    damages = applyModifiers(damages, defence.blockerModifiers ?? {})
    const pastShield = applyArmorTo(damages, power)
    const blocked = totalDamage(damages) - totalDamage(pastShield)
    shield = staggerDamage(pastShield) * staggerShare
    broken = before + shield >= limit
    stamina = guardStamina(defence, guard, Math.min(1, blocked / power), broken)
    if (!broken) damages = pastShield
  }

  const pastArmor = applyArmorTo(applyModifiers(damages, defence.modifiers ?? {}), defence.armor)
  // Character.RPC_Damage takes fire, spirit and poison out of the hit and hands them to their status effects.
  const { fire = 0, spirit = 0, poison = 0 } = pastArmor
  const rules = defence.overTime
  const burned = fire > 0 ? burning(rules.burning, fire) : null
  const haunted = spirit > 0 ? burning(rules.spirit, spirit) : null
  const poisoned = poison > 0 ? poisoning(rules.poison, poison) : null
  const overTime = [burned, haunted, poisoned].reduce((sum, part) => sum + (part?.damage ?? 0), 0)
  const direct = totalDamage(pastArmor) - fire - spirit - poison + trueDamage
  const landed = direct > MIN_DAMAGE
  const armor = landed ? staggerDamage(pastArmor) * hit.staggerMultiplier * staggerShare : 0
  const staggered = before + shield + armor >= limit

  return {
    verdict: verdictOf(hit.blockable, broken, staggered),
    staggered,
    received,
    taken: (landed ? direct : 0) + overTime,
    direct: landed ? direct : 0,
    burning: burned,
    poison: poisoned,
    spirit: haunted,
    stamina,
    bar: { before, shield, armor, limit },
  }
}
