import { describe, expect, it } from 'vitest'
import {
  blockPower,
  defenceOf,
  parryPower,
  type ArmorPiece,
  type Blocker,
  type PlayerRules,
  type Profile,
} from './block'

const silverShield: Blocker = { blockPower: 60, blockPowerPerLevel: 6, timedBlockBonus: 1.5 }
const ironTower: Blocker = { blockPower: 52, blockPowerPerLevel: 6, timedBlockBonus: 1 }
// The Player prefab's rules in 1.0.21, with the Burning, Spirit and Poison prefabs'.
const player: PlayerRules = {
  modifiers: { spirit: 'immune' },
  staggerFactor: 0.4,
  blockStaminaDrain: 10,
  perfectBlockStaminaDrain: 0,
  overTime: {
    burning: { ttl: 5, interval: 1 },
    spirit: { ttl: 3, interval: 0.5 },
    poison: { baseTtl: 1, ttlPerDamage: 5, ttlPower: 0.5, interval: 1 },
  },
}
// Silver shield level 3, blocking skill 25, armor 45, 150 health: the worked example of the mockups.
const worked: Profile = {
  player,
  blocker: silverShield,
  level: 3,
  skill: 25,
  armor: 45,
  maxHealth: 150,
}
const rootHarnesk: ArmorPiece = {
  armor: 8,
  armorPerLevel: 2,
  level: 4,
  modifiers: { pierce: 'resistant', fire: 'weak' },
}
const ashenCape: ArmorPiece = {
  armor: 12,
  armorPerLevel: 2,
  level: 1,
  modifiers: { frost: 'resistant' },
  blockStaminaModifier: -0.2,
}

describe('blockPower', () => {
  it('is the item value at level 1 without skill', () => {
    expect(blockPower(silverShield, 1, 0)).toBe(60)
  })

  it('adds the per-level bonus for each upgrade', () => {
    expect(blockPower(silverShield, 3, 0)).toBe(72)
  })

  it('grows by half at blocking skill 100', () => {
    expect(blockPower(silverShield, 1, 100)).toBe(90)
  })

  it('combines level and skill', () => {
    expect(blockPower(silverShield, 3, 25)).toBe(81)
  })
})

describe('parryPower', () => {
  it('multiplies the block power by the timed block bonus', () => {
    expect(parryPower(silverShield, 3, 25)).toBe(121.5)
  })

  it('is null for an item without a bonus above 1, which cannot parry', () => {
    expect(parryPower(ironTower, 3, 25)).toBeNull()
  })
})

describe('defenceOf', () => {
  it('turns a profile into the values a hit is resolved against', () => {
    expect(defenceOf(worked)).toEqual({
      blockPower: 81,
      parryPower: 121.5,
      armor: 45,
      maxHealth: 150,
      staggerFactor: 0.4,
      blockStaminaDrain: 10,
      parryStaminaDrain: 0,
      overTime: player.overTime,
      modifiers: { spirit: 'immune' },
      blockerModifiers: {},
      parryStaminaRegen: 0,
      staggerModifier: 0,
      blockStaminaGear: 0,
      blockStaminaEffects: 0,
      blockStaminaFlat: 0,
      wet: false,
    })
  })

  it('keeps a wet player wet, for the burns', () => {
    expect(defenceOf({ ...worked, wet: true }).wet).toBe(true)
  })

  it("carries the item's modifiers and its parry refund", () => {
    const serpent: Blocker = {
      ...silverShield,
      modifiers: { pierce: 'resistant' },
      perfectBlockStaminaRegen: 10,
    }
    const defence = defenceOf({ ...worked, blocker: serpent })

    expect(defence.blockerModifiers).toEqual({ pierce: 'resistant' })
    expect(defence.parryStaminaRegen).toBe(10)
  })

  it('adds the armor of each piece worn, at its level, to the armor typed', () => {
    // Root Harnesk level 4: 8 + 3 × 2; Ashen Cape level 1: 12.
    expect(defenceOf({ ...worked, armor: 0, pieces: [rootHarnesk, ashenCape] }).armor).toBe(26)
    expect(defenceOf({ ...worked, armor: 10, pieces: [rootHarnesk] }).armor).toBe(24)
  })

  it("adds each effect's armor, then grows the total by its multiplier, in the order they came", () => {
    // The Iron Brooch adds 20; no effect of 1.0.21 has a multiplier, but the game applies one in turn.
    const brooch = { addArmor: 20 }
    const growth = { armorMultiplier: 0.5 }

    expect(defenceOf({ ...worked, armor: 48, effects: [brooch] }).armor).toBe(68)
    expect(defenceOf({ ...worked, armor: 48, effects: [brooch, growth] }).armor).toBe(102)
    expect(defenceOf({ ...worked, armor: 48, effects: [growth, brooch] }).armor).toBe(92)
  })

  it('merges the modifiers of the player, the pieces and the effects', () => {
    const barleyWine = { modifiers: { fire: 'resistant' } } as const
    const defence = defenceOf({
      ...worked,
      pieces: [rootHarnesk, ashenCape],
      effects: [barleyWine],
    })

    expect(defence.modifiers).toEqual({
      pierce: 'resistant',
      fire: 'resistant',
      frost: 'resistant',
      spirit: 'immune',
    })
  })

  it("multiplies the parry power by each effect's bonus, and leaves the block power", () => {
    const evasionMantle = { parryBonus: 0.5 }
    const another = { parryBonus: 0.2 }

    expect(defenceOf({ ...worked, effects: [evasionMantle] })).toMatchObject({
      blockPower: 81,
      parryPower: 182.25,
    })
    expect(defenceOf({ ...worked, effects: [evasionMantle, another] }).parryPower).toBeCloseTo(
      121.5 * 1.5 * 1.2,
      9,
    )
  })

  it('lets no effect make an item parry that cannot', () => {
    expect(
      defenceOf({ ...worked, blocker: ironTower, effects: [{ parryBonus: 0.5 }] }).parryPower,
    ).toBeNull()
  })

  it("adds up the effects' stagger modifiers", () => {
    // Fader's power halves the stagger taken; a second effect would add its share to the same base.
    const fader = { staggerModifier: -0.5 }

    expect(defenceOf({ ...worked, effects: [fader] }).staggerModifier).toBe(-0.5)
    expect(
      defenceOf({ ...worked, effects: [fader, { staggerModifier: 0.2 }] }).staggerModifier,
    ).toBeCloseTo(-0.3, 9)
  })

  it("adds up what the pieces and what the effects change in a guard's stamina", () => {
    const bonemass = { blockStaminaModifier: -1, blockStaminaFlat: -5 }
    const evasionMantle = { blockStaminaModifier: -0.5 }

    expect(
      defenceOf({
        ...worked,
        pieces: [rootHarnesk, ashenCape],
        effects: [bonemass, evasionMantle],
      }),
    ).toMatchObject({ blockStaminaGear: -0.2, blockStaminaEffects: -1.5, blockStaminaFlat: -5 })
  })
})
