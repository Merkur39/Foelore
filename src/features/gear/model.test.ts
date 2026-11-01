import { describe, expect, it } from 'vitest'
import { blockerOf } from '@/app/context'
import type { Defence } from '@/combat/block'
import type { World } from '@/combat/world'
import { game } from '@/data'
import { blockPowerParts, FORGE_MAX_LEVEL, maxLevel, withstand } from './model'

const silverShield: Defence = {
  blockPower: 81,
  parryPower: 121.5,
  armor: 45,
  maxHealth: 150,
  staggerFactor: 0.4,
  blockStaminaDrain: 10,
  parryStaminaDrain: 0,
  overTime: game.player.overTime,
}
const normal: World = { difficulty: 'normal', players: 1 }

describe('withstand', () => {
  it('gives the mockup thresholds, on a scale common to both guards', () => {
    const { block, parry, scale } = withstand(silverShield, normal)

    expect(block.power).toBe(81)
    expect(block.unstaggered).toBeCloseTo(124.03, 1)
    expect(block.unbroken).toBeCloseTo(139.43, 1)
    expect(parry?.power).toBe(121.5)
    expect(parry?.unstaggered).toBeCloseTo(151.9, 1)
    expect(parry?.unbroken).toBeCloseTo(170.76, 1)
    expect(scale).toBe(200)
  })

  it('staggers at 40 % of the health', () => {
    expect(withstand(silverShield, normal).staggerAt).toBe(60)
  })

  it('has no parry for an item that cannot parry, and scales on the block alone', () => {
    const { parry, scale } = withstand({ ...silverShield, parryPower: null }, normal)

    expect(parry).toBeNull()
    // 139.43 × 1.1 = 153.4, up to the next 50.
    expect(scale).toBe(200)
  })

  it('reads hits as listed: the difficulty lowers the thresholds', () => {
    const hard = withstand(silverShield, { difficulty: 'hard', players: 1 })

    expect(hard.block.unbroken).toBeCloseTo(139.43 / 1.5, 1)
  })
})

describe('blockPowerParts', () => {
  it('splits the block power into the item at its level and the skill', () => {
    expect(blockPowerParts(blockerOf('ShieldSilver'), 3, 25)).toEqual({ base: 72, skill: 1.125 })
  })
})

describe('maxLevel', () => {
  it("is the item's max level when no station takes it further", () => {
    expect(maxLevel(blockerOf('Lantern'))).toBe(1)
  })

  it('goes past it for an item the Forge of Potential upgrades', () => {
    const silver = blockerOf('ShieldSilver')

    expect(silver.maxQuality).toBe(3)
    expect(maxLevel(silver)).toBe(FORGE_MAX_LEVEL)
  })
})
