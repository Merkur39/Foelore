import { describe, expect, it } from 'vitest'
import { burning, poisoning, type OverTimeRules } from './overTime'

// The Burning, Spirit and Poison prefabs in 1.0.21.
const rules: OverTimeRules = {
  burning: { ttl: 5, interval: 1 },
  spirit: { ttl: 3, interval: 0.5 },
  poison: { baseTtl: 1, ttlPerDamage: 5, ttlPower: 0.5, interval: 1 },
}

describe('burning', () => {
  it('deals the fire that passes over its 5 s, a fifth a second', () => {
    expect(burning(rules.burning, 2.9)).toEqual({ damage: 2.9, seconds: 5 })
  })

  it('lights no burn when a tick would deal under 0.2, nothing burning yet', () => {
    expect(burning(rules.burning, 0.9)).toEqual({ damage: 0, seconds: 0 })
  })

  it('lights one at 0.2 a tick exactly', () => {
    expect(burning(rules.burning, 1)).toEqual({ damage: 1, seconds: 5 })
  })

  it('shares spirit between its own 6 ticks over 3 s', () => {
    expect(burning(rules.spirit, 1)).toEqual({ damage: 0, seconds: 0 })
    expect(burning(rules.spirit, 1.5)).toEqual({ damage: 1.5, seconds: 3 })
  })
})

describe('poisoning', () => {
  it('lasts 1 + √(5 × dose) seconds on a player, a tick each whole second', () => {
    // Bonemass's punch, blocked with the Iron Buckler: 15.1 then 9.6 at the lowest roll.
    expect(poisoning(rules.poison, 15.1)).toEqual({ damage: 15.1, seconds: 9 })
    expect(poisoning(rules.poison, 9.6)).toEqual({ damage: 9.6, seconds: 7 })
  })

  it('deals nothing when each tick would be 0.1 or less, which the game drops', () => {
    // 1 + √1 = 2 s: two ticks of 0.1.
    expect(poisoning(rules.poison, 0.2)).toEqual({ damage: 0, seconds: 0 })
  })
})
