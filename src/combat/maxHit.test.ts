import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import type { Defence } from './block'
import { resolveHit, type Guard } from './hit'
import { gaugeScale, maxHit, type Endurance } from './maxHit'
import type { Difficulty, World } from './world'

// The Burning, Spirit and Poison prefabs in 1.0.21.
const overTime = {
  burning: { ttl: 5, interval: 1 },
  spirit: { ttl: 3, interval: 0.5 },
  poison: { baseTtl: 1, ttlPerDamage: 5, ttlPower: 0.5, interval: 1 },
}
const silverShield: Defence = {
  blockPower: 81,
  parryPower: 121.5,
  armor: 45,
  maxHealth: 150,
  staggerFactor: 0.4,
  blockStaminaDrain: 10,
  parryStaminaDrain: 0,
  overTime,
}
const normal: World = { difficulty: 'normal', players: 1 }

describe('maxHit', () => {
  it.each<[Guard, Endurance, number]>([
    ['block', 'unstaggered', 124.03],
    ['block', 'unbroken', 139.43],
    ['parry', 'unstaggered', 151.9],
    ['parry', 'unbroken', 170.76],
  ])('gives the mockup thresholds: %s %s up to %s', (guard, endurance, expected) => {
    expect(maxHit(silverShield, normal, guard, endurance)).toBeCloseTo(expected, 1)
  })

  it('is given in damage as listed, before the difficulty', () => {
    const hard = maxHit(silverShield, { difficulty: 'hard', players: 1 }, 'block', 'unbroken')

    expect(hard).toBeCloseTo(139.43 / 1.5, 1)
  })

  it('is null for a parry with an item that cannot parry', () => {
    expect(maxHit({ ...silverShield, parryPower: null }, normal, 'parry', 'unbroken')).toBeNull()
  })

  it('sits exactly on the edge of what the shield takes', () => {
    const difficulties: Difficulty[] = ['veryEasy', 'easy', 'normal', 'hard', 'veryHard']
    const defence = fc.record({
      blockPower: fc.double({ min: 1, max: 400, noNaN: true }),
      parryPower: fc.constant(null),
      armor: fc.double({ min: 0, max: 300, noNaN: true }),
      maxHealth: fc.double({ min: 25, max: 400, noNaN: true }),
      staggerFactor: fc.constant(0.4),
      blockStaminaDrain: fc.constant(10),
      parryStaminaDrain: fc.constant(0),
      overTime: fc.constant(overTime),
      staggerModifier: fc.double({ min: -0.9, max: 1, noNaN: true }),
    })
    const world = fc.record({
      difficulty: fc.constantFrom(...difficulties),
      players: fc.integer({ min: 1, max: 5 }),
    })
    const endurance = fc.constantFrom<Endurance>('unstaggered', 'unbroken')
    const within = (d: Defence, w: World, e: Endurance, hit: number) => {
      const verdict = resolveHit(
        d,
        { damages: { blunt: hit }, staggerMultiplier: 1, blockable: true },
        w,
        { guard: 'block', stars: 0, barBefore: 0 },
      )?.verdict
      return e === 'unbroken' ? verdict !== 'broken' : verdict === 'holds'
    }

    fc.assert(
      fc.property(defence, world, endurance, (d, w, e) => {
        const edge = maxHit(d, w, 'block', e)!
        expect(within(d, w, e, edge * (1 - 1e-6))).toBe(true)
        expect(within(d, w, e, edge * (1 + 1e-6))).toBe(false)
      }),
    )
  })
})

describe('gaugeScale', () => {
  it('leaves 10 % of room past the largest threshold, rounded up to a multiple of 50', () => {
    expect(gaugeScale([139.43, 170.76])).toBe(200)
  })

  it('moves to the next step once the thresholds grow', () => {
    expect(gaugeScale([300])).toBe(350)
  })

  it('never goes below 50', () => {
    expect(gaugeScale([0])).toBe(50)
  })
})
