import { createContext, use, useState } from 'react'
import { useAppState } from '@/app/useAppState'
import type { GameCreature } from '@/data/types'
import { barrierCapacity, carriedEffects, NOTHING_CARRIED } from '@/features/gear/carried'

/** The effects switched on, by their ids, and the creature they hold for. Kept in memory only: they
 * last seconds to minutes in the game, so a relaunch finds none on. */
export interface Lit {
  readonly creature: string | null
  readonly on: readonly string[]
}

export const LitContext = createContext<{
  readonly lit: Lit
  readonly setLit: (lit: Lit) => void
} | null>(null)

const NONE_ON: Lit = { creature: null, on: [] }

/** The id the group's Magic barrier is switched by, beside the effects'. */
export const BARRIER = 'barrier'

/** In the shell, over every screen: what is on holds until another creature is shown, on its sheet or
 * in the Simulation of one of its attacks. */
export function useLitState(shown: string | null) {
  const [lit, setLit] = useState(NONE_ON)
  if (shown !== null && shown !== lit.creature) {
    const next = { creature: shown, on: [] }
    setLit(next)
    return { lit: next, setLit }
  }
  return { lit, setLit }
}

/** What Your gear carries, what of it is on for this creature (in the same order), the group's Magic
 * barrier when Your gear has one (what it absorbs, whether it is on), and a way to switch one on or off.
 * Nothing is on without a creature. */
export function useLit(creature: GameCreature | null) {
  const context = use(LitContext)
  if (!context) throw new Error('No lit effects: render the app inside a LitContext')
  const { gear } = useAppState()
  const carried = carriedEffects(gear.carried ?? NOTHING_CARRIED)
  const ids = creature !== null && context.lit.creature === creature.id ? context.lit.on : []
  const bloodMagic = (gear.carried ?? NOTHING_CARRIED).barrier
  return {
    carried,
    on: carried.filter((effect) => ids.includes(effect.id)),
    barrier:
      bloodMagic === undefined
        ? null
        : { capacity: barrierCapacity(bloodMagic), on: ids.includes(BARRIER) },
    toggle: (id: string) => {
      if (creature === null) return
      context.setLit({
        creature: creature.id,
        on: ids.includes(id) ? ids.filter((other) => other !== id) : [...ids, id],
      })
    },
  }
}
