import { blockPower, defenceOf, type Defence } from '@/combat/block'
import { worldScale } from '@/combat/world'
import { game } from '@/data'
import type { GameBlocker, GameRuleEffect, GameWorldPreset } from '@/data/types'
import { setEffects, wornPieces } from '@/features/gear/pieces'
import type { Gear } from './store'
import type { World } from '@/combat/world'

// The store only holds ids the game data has (checked on load), so a miss is a bug.
export function blockerOf(id: string): GameBlocker {
  const blocker = game.blockers.find((candidate) => candidate.id === id)
  if (!blocker) throw new Error(`No blocker ${id} in the game data`)
  return blocker
}

export function presetOf(world: World): GameWorldPreset {
  const preset = game.world.presets.find((candidate) => candidate.id === world.difficulty)
  if (!preset) throw new Error(`No world preset ${world.difficulty} in the game data`)
  return preset
}

export const gearBlockPower = (gear: Gear) =>
  blockPower(blockerOf(gear.blocker), gear.level, gear.skill)

/** What a hit is resolved against with this gear, under the player's own rules: the pieces worn and the
 * bonus of a complete set count, what is carried only once switched on (`on`, after the sets), Wet when
 * it is on (its resistances last). */
export const gearDefence = (gear: Gear, on: readonly GameRuleEffect[] = [], wet = false): Defence =>
  defenceOf({
    ...gear,
    blocker: blockerOf(gear.blocker),
    player: game.player,
    pieces: wornPieces(gear.pieces ?? {}),
    effects: [
      ...setEffects(gear.pieces ?? {}),
      ...on,
      ...(wet ? [{ modifiers: game.wet.modifiers }] : []),
    ],
    wet,
  })

/** What the world multiplies the hits monsters land on you by. */
export const enemyScale = (world: World) => worldScale(world).enemy
