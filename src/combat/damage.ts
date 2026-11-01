export const DAMAGE_TYPES = [
  'blunt',
  'slash',
  'pierce',
  'fire',
  'frost',
  'lightning',
  'poison',
  'spirit',
] as const

export type DamageType = (typeof DAMAGE_TYPES)[number]

/** Damage of a hit by type; a missing type deals none. */
export type Damages = Partial<Record<DamageType, number>>

// Character.ApplyDamage drops a hit of 0.1 or less, and a tick of damage over time alike.
export const MIN_DAMAGE = 0.1

// The only types that fill a stagger bar (HitData.DamageTypes.GetTotalStaggerDamage).
export const STAGGER_TYPES: readonly DamageType[] = ['blunt', 'slash', 'pierce', 'lightning']

const sumOf = (damages: Damages, types: readonly DamageType[]) =>
  types.reduce((sum, type) => sum + (damages[type] ?? 0), 0)

export const totalDamage = (damages: Damages) => sumOf(damages, DAMAGE_TYPES)

export const staggerDamage = (damages: Damages) => sumOf(damages, STAGGER_TYPES)

export function scaleDamages(damages: Damages, factor: number): Damages {
  const scaled: Damages = {}
  for (const type of DAMAGE_TYPES) {
    const value = damages[type]
    if (value !== undefined) scaled[type] = value * factor
  }
  return scaled
}
