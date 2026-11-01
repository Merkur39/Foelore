import { gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { DAMAGE_TYPES, type DamageType } from '@/combat/damage'
import { resolveHit, type Guard, type Hit } from '@/combat/hit'
import { mergeModifiers, type DamageModifiers } from '@/combat/modifiers'
import type { World } from '@/combat/world'
import type { ArmorSlot, GameCreature, GameRuleEffect } from '@/data/types'
import { fightersOf } from '@/features/bestiary/model'
import { changesNoHit, isCarried, type CarriedKind } from '@/features/gear/carried'
import { pieceOf, setEffects, SLOTS } from '@/features/gear/pieces'

/** What already resists a damage type as well as an effect would: a group's power by its id. */
export type Holder =
  | { readonly kind: 'piece'; readonly slot: ArmorSlot }
  | { readonly kind: 'set' }
  | { readonly kind: CarriedKind }
  | { readonly kind: 'group'; readonly id: string }

/** Why an effect changes nothing in a fight, its main reason first: it changes no hit at all, none of its
 * types is dealt, or what is dealt is already resisted; `nothing` when none says it. */
export type Idle =
  | { readonly kind: 'noHit' }
  | { readonly kind: 'notDealt'; readonly types: readonly DamageType[] }
  | { readonly kind: 'resisted'; readonly by: Holder }
  | { readonly kind: 'nothing' }

/** A fight as the sheet or the Simulation shows it: the gear, the effects switched on, and the hits. */
export interface Against {
  readonly gear: Gear
  readonly on: readonly GameRuleEffect[]
  readonly hits: readonly Hit[]
  readonly world: World
  readonly stars: number
}

/** Every hit a creature deals over its phases: its attacks, then trampling and its death. */
export const creatureHits = (creature: GameCreature): readonly Hit[] =>
  fightersOf(creature).flatMap((fighter) => [
    ...fighter.attacks.flatMap((attack) => attack.hits),
    ...(fighter.trample?.hits ?? []),
    ...(fighter.onDeath ?? []),
  ])

const GUARDS: readonly Guard[] = ['block', 'parry']

/** Null when switching `effect` on or off changes what a hit does, with what else is on: the damage, the
 * stamina, the bar or a verdict, under either guard. Else why it changes nothing. */
export function idleOf(
  effect: GameRuleEffect,
  { gear, on, hits, world, stars }: Against,
): Idle | null {
  const others = on.filter((other) => other.id !== effect.id)
  const without = gearDefence(gear, others)
  const within = gearDefence(gear, [...others, effect])
  const changes = hits.some((hit) =>
    GUARDS.some((guard) => {
      const options = { guard, stars, barBefore: 0 }
      return (
        JSON.stringify(resolveHit(without, hit, world, options)) !==
        JSON.stringify(resolveHit(within, hit, world, options))
      )
    }),
  )
  return changes ? null : reasonOf(effect, gear, others, hits)
}

const changed = (modifiers: DamageModifiers = {}) =>
  DAMAGE_TYPES.filter((type) => modifiers[type] !== undefined && modifiers[type] !== 'normal')

function reasonOf(
  effect: GameRuleEffect,
  gear: Gear,
  others: readonly GameRuleEffect[],
  hits: readonly Hit[],
): Idle {
  if (changesNoHit(effect)) return { kind: 'noHit' }
  const types = changed(effect.modifiers)
  const dealt = types.filter((type) => hits.some((hit) => (hit.damages[type] ?? 0) > 0))
  if (types.length > 0 && dealt.length === 0) return { kind: 'notDealt', types }
  const holders: { readonly by: Holder; readonly modifiers: DamageModifiers }[] = [
    ...SLOTS.flatMap((slot) => {
      const worn = gear.pieces?.[slot]
      return worn
        ? [{ by: { kind: 'piece', slot } as const, modifiers: pieceOf(worn.id).modifiers }]
        : []
    }),
    ...setEffects(gear.pieces ?? {}).map((set) => ({
      by: { kind: 'set' } as const,
      modifiers: set.modifiers ?? {},
    })),
    ...others.filter(isCarried).map((other) => ({
      by: gear.carried?.group.includes(other.id)
        ? ({ kind: 'group', id: other.id } as const)
        : { kind: other.kind },
      modifiers: other.modifiers ?? {},
    })),
  ]
  // A holder whose state the effect's would not replace (HitData.DamageModifiers.ShouldOverride).
  for (const type of dealt) {
    const holder = holders.find(({ modifiers }) => {
      const held = modifiers[type]
      return (
        held !== undefined &&
        mergeModifiers({ [type]: held }, { [type]: effect.modifiers?.[type] })[type] === held
      )
    })
    if (holder) return { kind: 'resisted', by: holder.by }
  }
  return { kind: 'nothing' }
}
