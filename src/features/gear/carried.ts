import { game } from '@/data'
import type { GameRuleEffect, RuleEffectKind } from '@/data/types'

/** What Your gear says the player carries, by the ids of their effects in the game data: none of it
 * counts until it is switched on, on a creature's sheet or in the Simulation. */
export interface Carried {
  readonly trinket: string | null
  readonly power: string | null
  /** Each a different drink: the game takes one of each at a time. */
  readonly drinks: readonly string[]
  /** The powers players of the group cast within 10 m of you (Player.ActivateGuardianPower): each a
   * different one, never your own, since the same power again only restarts its time. */
  readonly group: readonly string[]
}

export const NOTHING_CARRIED: Carried = { trinket: null, power: null, drinks: [], group: [] }

/** The kinds of effects one carries: a trinket, a guardian power, drinks. */
export type CarriedKind = Extract<RuleEffectKind, 'trinket' | 'power' | 'consumable'>

export type CarriedEffect = GameRuleEffect & { readonly kind: CarriedKind }

const CARRIED_KINDS: readonly RuleEffectKind[] = ['trinket', 'power', 'consumable']

export const isCarried = (effect: GameRuleEffect): effect is CarriedEffect =>
  CARRIED_KINDS.includes(effect.kind)

// The store only holds ids the game data has (checked on load), so a miss is a bug.
export function effectOf(id: string): GameRuleEffect {
  const effect = game.ruleEffects.find((candidate) => candidate.id === id)
  if (!effect) throw new Error(`No rule effect ${id} in the game data`)
  return effect
}

// The powers in the order their bosses fall, the trinkets and drinks as the mockups list them; what a
// later version of the game adds comes after them.
const ORDER = [
  'GP_Eikthyr',
  'GP_TheElder',
  'GP_Bonemass',
  'GP_Moder',
  'GP_Yagluth',
  'GP_Queen',
  'GP_Fader',
  'TrinketIronHealth',
  'TrinketBloodGoldHealth',
  'TrinketSilverResist',
  'TrinketBlackStamina',
  'Potion_frostresist',
  'Potion_barleywine',
  'Potion_poisonresist',
  'Potion_bzerker',
]
const rank = (effect: GameRuleEffect) => {
  const at = ORDER.indexOf(effect.id)
  return at === -1 ? ORDER.length : at
}

const CHANGES = [
  'modifiers',
  'addArmor',
  'armorMultiplier',
  'staggerModifier',
  'parryBonus',
  'blockStaminaModifier',
  'blockStaminaFlat',
  'dodgeStaminaModifier',
] as const satisfies readonly (keyof GameRuleEffect)[]

/** Eikthyr's and The Elder's powers: carried like the others, though nothing in them reaches a hit. */
export const changesNoHit = (effect: GameRuleEffect) =>
  CHANGES.every((change) => effect[change] === undefined)

/** The effects of a kind one can carry, in the order Your gear and the Arsenal list them. */
export const carriable = (kind: CarriedKind): CarriedEffect[] =>
  game.ruleEffects
    .filter((effect): effect is CarriedEffect => effect.kind === kind)
    .toSorted((a, b) => rank(a) - rank(b))

/** What is carried, as a creature's sheet lists it: the trinket, the power, the drinks, then the
 * group's powers. */
export const carriedEffects = ({ trinket, power, drinks, group }: Carried): CarriedEffect[] =>
  [trinket, power, ...drinks, ...group]
    .flatMap((id) => (id === null ? [] : [effectOf(id)]))
    .filter(isCarried)
