import { worldScale, type World } from './world'

// Character.SetupMaxHealth: health × level, a star being one level above the first.
export const creatureHealth = (health: number, stars: number) => health * (stars + 1)

/** What decides when a creature staggers. */
export interface Staggering {
  readonly health: number
  readonly staggerFactor: number
  /** Whether its animator can play a stagger: a full bar does nothing otherwise (Character.RPC_Stagger). */
  readonly staggerable: boolean
}

/** Stagger damage that fills a creature's bar; null when it never staggers. */
export function staggerThreshold(
  { health, staggerFactor, staggerable }: Staggering,
  stars: number,
) {
  return staggerable && staggerFactor > 0 ? creatureHealth(health, stars) * staggerFactor : null
}

/** Damage to deal, as your hits list it, once the world has scaled them down: to fill a creature's
 * stagger bar, or to bring its health down, which the world never changes (Character.ApplyDamage). */
export const toInflict = (amount: number, world: World) => amount / worldScale(world).you
