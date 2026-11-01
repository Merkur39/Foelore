import type { Route } from '@/app/routes'
import type { AttackRef } from '@/app/store'
import { game } from '@/data'
import type { GameCreature } from '@/data/types'
import { fightersOf, type FoundAttack } from '@/features/bestiary/model'

/** How many attacks « Choisir une attaque » keeps at hand. */
const MAX_RECENT = 2
// How far from the share « Détails » may say it.
const ODDS_TOLERANCE = 0.03

const FRACTIONS = Array.from({ length: 9 }, (_, index) => index + 2).flatMap((q) =>
  Array.from({ length: q - 1 }, (_, n) => [n + 1, q] as const),
)

/** A share of the rolls as a player says it, [n, q] for « n in q »: the simplest, q up to 10, that falls
 * within 3 points of it; else the nearest. */
export function oddsFraction(share: number): readonly [number, number] {
  const gap = ([n, q]: readonly [number, number]) => Math.abs(n / q - share)
  return (
    FRACTIONS.find((fraction) => gap(fraction) <= ODDS_TOLERANCE) ??
    FRACTIONS.reduce((best, fraction) => (gap(fraction) < gap(best) ? fraction : best))
  )
}

/** The recent attacks once `ref` is simulated: it comes first, once. */
export function withRecent(recents: readonly AttackRef[], ref: AttackRef): readonly AttackRef[] {
  const others = recents.filter(
    (recent) => recent.fighter !== ref.fighter || recent.attack !== ref.attack,
  )
  return [ref, ...others].slice(0, MAX_RECENT)
}

/** The attack an address or a recent names, by its creature (or boss phase) and its first item;
 * null when the data lacks it, or when it only summons, which leaves nothing to simulate. */
export function findAttack({
  fighter: fighterId,
  attack: attackId,
}: AttackRef): FoundAttack | null {
  for (const creature of game.creatures) {
    const fighter = fightersOf(creature).find((candidate) => candidate.id === fighterId)
    const attack = fighter?.attacks.find((candidate) => candidate.ids[0] === attackId)
    if (fighter && attack) return attack.hits.length > 0 ? { creature, fighter, attack } : null
  }
  return null
}

export const refOfFound = ({ fighter, attack }: FoundAttack): AttackRef => ({
  fighter: fighter.id,
  attack: attack.ids[0] ?? '',
})

/** `#/simulation/<creature or phase>/<attack>`; the bare screen when there is no attack. */
export const simulationRoute = (ref: AttackRef | null): Route => ({
  screen: 'simulation',
  path: ref === null ? [] : [ref.fighter, ref.attack],
  query: '',
  modal: null,
})

export function refOf(route: Route): AttackRef | null {
  const [fighter, attack] = route.path
  return fighter === undefined || attack === undefined ? null : { fighter, attack }
}

/** The attacks of a creature that deal something, every phase included. */
export const simulableCount = (creature: GameCreature) =>
  fightersOf(creature).reduce(
    (count, fighter) => count + fighter.attacks.filter((attack) => attack.hits.length > 0).length,
    0,
  )
