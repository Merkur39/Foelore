import { verdictSeverity, worstVerdict } from './advice'
import type { Defence } from './block'
import {
  listedDamage,
  LOWEST_ROLL,
  resolveHit,
  type Guard,
  type Hit,
  type HitOptions,
  type HitResult,
  type Verdict,
} from './hit'
import type { World } from './world'

/** One hit of a monster attack, and whether a roll avoids it. */
export interface AttackHit extends Hit {
  readonly dodgeable: boolean
}

/** How an attack fares against each guard; parry is null when the item cannot parry. */
export interface AttackVerdicts {
  readonly block: Verdict
  readonly parry: Verdict | null
  readonly dodgeable: boolean
}

/**
 * An attack at a glance, with an empty bar: for each guard the worst verdict among its hits, and a
 * roll avoids it only when it avoids every hit. Null for an attack that only summons.
 */
export function attackVerdicts(
  defence: Defence,
  hits: readonly AttackHit[],
  world: World,
  stars: number,
): AttackVerdicts | null {
  const verdictOf = (guard: Guard) => {
    const verdicts: Verdict[] = []
    for (const hit of hits) {
      const result = resolveHit(defence, hit, world, { guard, stars, barBefore: 0 })
      if (result === null) return null
      verdicts.push(result.verdict)
    }
    return worstVerdict(verdicts)
  }
  const block = verdictOf('block')
  if (block === null) return null
  return { block, parry: verdictOf('parry'), dodgeable: hits.every((hit) => hit.dodgeable) }
}

function hardest(
  defence: Defence,
  hits: readonly AttackHit[],
  world: World,
  options: HitOptions,
): { hit: AttackHit; result: HitResult } | null {
  let found: { hit: AttackHit; result: HitResult } | null = null
  for (const hit of hits) {
    const result = resolveHit(defence, hit, world, options)
    if (result === null) return null
    const worse =
      found === null ||
      verdictSeverity(result.verdict) > verdictSeverity(found.result.verdict) ||
      (result.verdict === found.result.verdict && result.taken > found.result.taken)
    if (worse) found = { hit, result }
  }
  return found
}

/** The hit of an attack a guard fares worst against: the worst verdict, then the most damage taken.
 * Null when the item cannot parry, or the attack only summons. */
export const hardestHit = (
  defence: Defence,
  hits: readonly AttackHit[],
  world: World,
  options: HitOptions,
): HitResult | null => hardest(defence, hits, world, options)?.result ?? null

/** A hit across the game's roll: at its lowest and at its top, and the share of the rolls that end in the
 * top's verdict. */
export interface RollRange {
  readonly low: HitResult
  readonly top: HitResult
  readonly odds: number
  /** False for a hit with its own damage, which the game does not roll. */
  readonly rolled: boolean
}

// Width of the roll at which the bisection stops; far below what the interface shows.
const PRECISION = 1e-9

/**
 * The hardest hit of an attack, as hardestHit judges it at the top of the roll, across the roll. The roll is
 * √U, U even over [0.75, 1]; every step of a hit grows with it, so the top's verdict holds from one roll up,
 * found by bisection, and comes (1 − roll²) / 0.25 of the time.
 */
export function hardestRange(
  defence: Defence,
  hits: readonly AttackHit[],
  world: World,
  options: HitOptions,
): RollRange | null {
  const found = hardest(defence, hits, world, { ...options, roll: 1 })
  if (found === null) return null
  const { hit, result: top } = found
  const at = (roll: number) => resolveHit(defence, hit, world, { ...options, roll })!
  const low = at(LOWEST_ROLL)
  const rolled = (hit.scaling ?? 'attack') === 'attack'
  if (low.verdict === top.verdict) return { low, top, odds: 1, rolled }
  let below = LOWEST_ROLL
  let from = 1
  while (from - below > PRECISION) {
    const middle = (below + from) / 2
    if (at(middle).verdict === top.verdict) from = middle
    else below = middle
  }
  return { low, top, odds: (1 - from * from) / 0.25, rolled }
}

/** The largest hit of an attack as the game lists it at these stars; null when it only summons. */
export const attackDamage = (hits: readonly AttackHit[], stars: number) =>
  hits.length === 0 ? null : Math.max(...hits.map((hit) => listedDamage(hit, stars)))
