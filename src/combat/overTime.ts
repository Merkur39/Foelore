import { MIN_DAMAGE } from './damage'

/** Burning and Spirit (SE_Burning): the dose is shared between ttl / interval ticks. */
export interface TickRule {
  readonly ttl: number
  readonly interval: number
}

/** Poison (SE_Poison) on a player: baseTtl + (dose × ttlPerDamage) ^ ttlPower seconds, a tick every interval. */
export interface PoisonRule {
  readonly baseTtl: number
  readonly ttlPerDamage: number
  readonly ttlPower: number
  readonly interval: number
}

/** How the status effects deal the fire, spirit and poison of a hit, as the game data lists them. */
export interface OverTimeRules {
  readonly burning: TickRule
  readonly spirit: TickRule
  readonly poison: PoisonRule
}

/** What a status effect deals from one hit, and over how long; nothing when the hit starts none. */
export interface OverTime {
  readonly damage: number
  readonly seconds: number
}

const NONE: OverTime = { damage: 0, seconds: 0 }

// SE_Burning.m_minimumDamageTick: with nothing burning yet, a dose this small a tick starts no burn.
const MIN_BURN_TICK = 0.2

// SE_Burning.UpdateStatusEffect: on a wet player (SE_Wet), a burn's time gains five times the frame's on top of
// it while fire is left, so it runs six times as fast.
const WET_PACE = 6

/** SE_Burning.AddFireDamage (and AddSpiritDamage), with nothing burning yet. On a wet player, a burn lasts a
 * sixth of its time and deals the ticks that fit in it, at least its first: one fifth of the dose for Burning. */
export function burning(rule: TickRule, dose: number, wet = false): OverTime {
  const ticks = Math.floor(rule.ttl / rule.interval)
  if (dose / ticks < MIN_BURN_TICK) return NONE
  if (!wet) return { damage: dose, seconds: rule.ttl }
  const dealt = Math.max(1, Math.floor(rule.ttl / WET_PACE / rule.interval))
  return { damage: (dose / ticks) * dealt, seconds: rule.ttl / WET_PACE }
}

/** SE_Poison.AddDamage, with nothing poisoning yet: each tick goes through Character.ApplyDamage, which drops
 * one of 0.1 or less. */
export function poisoning(rule: PoisonRule, dose: number): OverTime {
  const ttl = rule.baseTtl + Math.pow(dose * rule.ttlPerDamage, rule.ttlPower)
  const ticks = Math.floor(ttl / rule.interval)
  return dose / ticks <= MIN_DAMAGE ? NONE : { damage: dose, seconds: ticks * rule.interval }
}
