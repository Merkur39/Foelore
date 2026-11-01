import { describe, expect, it } from 'vitest'
import type { Defence } from './block'
import type { Damages } from './damage'
import { LOWEST_ROLL, resolveHit, type Hit, type HitOptions } from './hit'
import type { World } from './world'

// The Player prefab's rules in 1.0.21, with the Burning, Spirit and Poison prefabs'.
const rules = {
  staggerFactor: 0.4,
  blockStaminaDrain: 10,
  parryStaminaDrain: 0,
  overTime: {
    burning: { ttl: 5, interval: 1 },
    spirit: { ttl: 3, interval: 0.5 },
    poison: { baseTtl: 1, ttlPerDamage: 5, ttlPower: 0.5, interval: 1 },
  },
}
// Silver shield level 3, blocking skill 25, armor 45, 150 health: the worked example of the
// « Le combat dans Valheim » page and of the design mockups.
const silverShield: Defence = {
  blockPower: 81,
  parryPower: 121.5,
  armor: 45,
  maxHealth: 150,
  ...rules,
}
const ironTower: Defence = { ...silverShield, parryPower: null }
// Iron Buckler level 3, Blocking 16, armor 48, 140 health, against Moder's bite: the fight the
// audit of 2026-10-30 checked against the game's code.
const ironBuckler: Defence = {
  blockPower: 43.2,
  parryPower: 108,
  armor: 48,
  maxHealth: 140,
  ...rules,
}

const alone = (difficulty: World['difficulty'] = 'normal'): World => ({ difficulty, players: 1 })
const hitOf = (damages: Damages, more: Partial<Hit> = {}): Hit => ({
  damages,
  staggerMultiplier: 1,
  blockable: true,
  ...more,
})
const block: HitOptions = { guard: 'block', stars: 0, barBefore: 0 }
const parry: HitOptions = { guard: 'parry', stars: 0, barBefore: 0 }

describe('resolveHit', () => {
  it('holds a 90 blocked on normal, taking 3.5 for 8 stamina', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), block)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(3.47, 2)
    expect(result?.stamina).toBeCloseTo(8.02, 2)
  })

  it('takes 1.5 for no stamina when the same hit is parried', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), parry)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(1.54, 2)
    expect(result?.stamina).toBe(0)
  })

  it('fills the bar with what passes the shield, then with what passes the armor', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), block)

    expect(result?.bar.before).toBe(0)
    expect(result?.bar.shield).toBeCloseTo(25, 6)
    expect(result?.bar.armor).toBeCloseTo(3.47, 2)
    expect(result?.bar.limit).toBe(60)
  })

  it('holds but staggers when the same hit lands on hard', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone('hard'), block)

    expect(result?.received).toBe(135)
    expect(result?.verdict).toBe('staggered')
    expect(result?.taken).toBeCloseTo(17.58, 2)
  })

  it('still holds a parry on hard, taking 7.8', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone('hard'), parry)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(7.81, 2)
  })

  it('breaks on very hard: the shield gives way and the whole hit meets the armor', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone('veryHard'), block)

    expect(result?.verdict).toBe('broken')
    expect(result?.staggered).toBe(true)
    expect(result?.taken).toBe(135)
  })

  it('matches the mockups for a 130 blow: blocking staggers, parrying holds', () => {
    const blocked = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), block)
    const parried = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), parry)

    expect(blocked?.verdict).toBe('staggered')
    expect(blocked?.taken).toBeCloseTo(15.1, 1)
    expect(blocked?.stamina).toBeCloseTo(9.6, 1)
    expect(parried?.verdict).toBe('holds')
    expect(parried?.taken).toBeCloseTo(6.7, 1)
  })

  it('raises the damage by half per star', () => {
    const oneStar = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), { ...block, stars: 1 })
    const twoStars = resolveHit(silverShield, hitOf({ blunt: 130 }), alone(), {
      ...block,
      stars: 2,
    })

    expect(oneStar?.received).toBe(195)
    expect(twoStars?.received).toBe(260)
  })

  it('starts from the bar already filled before the hit', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), {
      ...block,
      barBefore: 0.5,
    })

    expect(result?.bar.before).toBe(30)
    expect(result?.verdict).toBe('holds')
  })

  it('breaks when the bar already filled leaves too little room', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 90 }), alone(), {
      ...block,
      barBefore: 0.75,
    })

    expect(result?.verdict).toBe('broken')
  })

  it('keeps fire out of the bar while it still hurts', () => {
    const result = resolveHit(silverShield, hitOf({ slash: 45, fire: 45 }), alone(), block)

    expect(result?.taken).toBeCloseTo(3.47, 2)
    expect(result?.bar.shield).toBeCloseTo(12.5, 6)
    expect(result?.bar.armor).toBeCloseTo(3.47 / 2, 2)
  })

  it("weighs the attack's stagger multiplier on what passes the armor only", () => {
    // At ×1 this blow staggers: 48.2 past the shield + 12.9 past the armor tops the 60 limit.
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 125 }, { staggerMultiplier: 0.8 }),
      alone(),
      block,
    )

    expect(result?.bar.shield).toBeCloseTo(48.23, 2)
    expect(result?.bar.armor).toBeCloseTo(12.92 * 0.8, 2)
    expect(result?.verdict).toBe('holds')
  })

  it('sends an unblockable hit straight to the armor', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { blockable: false }),
      alone(),
      block,
    )

    expect(result?.verdict).toBe('unblockable')
    expect(result?.taken).toBe(45)
    expect(result?.stamina).toBe(0)
    expect(result?.bar.shield).toBe(0)
  })

  it('ignores what is left at 0.1 or less, as the game does', () => {
    const result = resolveHit(silverShield, hitOf({ blunt: 5 }), alone(), block)

    expect(result?.taken).toBe(0)
    expect(result?.bar.armor).toBe(0)
  })

  it('has no parry to resolve with an item that cannot parry', () => {
    expect(resolveHit(ironTower, hitOf({ blunt: 90 }), alone(), parry)).toBeNull()
  })

  it('leaves the stars out of a hit with its own damage', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { scaling: 'world' }),
      alone('hard'),
      {
        ...block,
        stars: 1,
      },
    )

    expect(result?.received).toBe(135)
  })

  it('leaves the world out of a hit with no owner', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { scaling: 'none' }),
      alone('hard'),
      {
        ...block,
        stars: 1,
      },
    )

    expect(result?.received).toBe(90)
  })

  it('adds true damage past the guard and the armor, without stagger', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 80, frost: 10 }, { trueDamage: 15 }),
      alone(),
      block,
    )

    expect(result?.received).toBe(105)
    expect(result?.taken).toBeCloseTo(3.47 + 15, 2)
    expect(result?.bar.armor).toBeCloseTo(3.47 * (80 / 90), 2)
  })

  it('scales true damage with the stars but not with the world', () => {
    const result = resolveHit(
      silverShield,
      hitOf({ blunt: 90 }, { trueDamage: 15 }),
      alone('hard'),
      {
        ...block,
        stars: 1,
      },
    )

    expect(result?.received).toBe(90 * 1.5 * 1.5 + 15 * 1.5)
  })

  it("applies the player's modifiers past the guard, before the armor", () => {
    const immune: Defence = { ...silverShield, modifiers: { spirit: 'immune' } }
    const result = resolveHit(immune, hitOf({ slash: 90, spirit: 30 }), alone(), block)

    // 120 against 81 leaves 44.4, of which 11.1 spirit: only the 33.3 slash meets the armor.
    expect(result?.taken).toBeCloseTo(33.33 ** 2 / 180, 2)
  })

  it("applies the shield's modifiers before the block, and keeps them when it breaks", () => {
    const serpent: Defence = { ...silverShield, blockerModifiers: { pierce: 'resistant' } }
    const result = resolveHit(serpent, hitOf({ pierce: 400 }), alone(), block)

    expect(result?.received).toBe(400)
    expect(result?.verdict).toBe('broken')
    expect(result?.taken).toBe(200 - 45)
  })

  it('gives stamina back on a parry with an item that refunds it', () => {
    const torch: Defence = { ...silverShield, parryStaminaRegen: 10 }

    expect(resolveHit(torch, hitOf({ blunt: 90 }), alone(), parry)?.stamina).toBe(-10)
  })

  it('tells apart what lands at once, the number the game shows', () => {
    const result = resolveHit(silverShield, hitOf({ slash: 45, fire: 45 }), alone(), block)

    expect(result?.direct).toBeCloseTo(3.47 / 2, 2)
    expect(result?.taken).toBeCloseTo(3.47, 2)
  })

  it('tells apart the fire that burns over 5 s', () => {
    const result = resolveHit(silverShield, hitOf({ slash: 45, fire: 45 }), alone(), block)

    expect(result?.burning?.damage).toBeCloseTo(3.47 / 2, 2)
    expect(result?.burning?.seconds).toBe(5)
    expect(result?.poison).toBeNull()
  })

  it('drops a direct remainder of 0.1 or less but still burns', () => {
    const bare: Defence = { ...silverShield, armor: 0 }
    const result = resolveHit(bare, hitOf({ blunt: 0.5, fire: 40 }), alone(), block)

    // 40.5 against 81 leaves 5.06: 0.06 blunt, dropped, and 5 fire, burned.
    expect(result?.taken).toBeCloseTo(5, 2)
    expect(result?.bar.armor).toBe(0)
  })

  it("counts no fire when too little passes to light a burn: the Cultist's Fireclaw, parried", () => {
    const result = resolveHit(ironBuckler, hitOf({ slash: 35, fire: 40 }), alone(), parry)

    expect(result?.burning).toEqual({ damage: 0, seconds: 0 })
    expect(result?.taken).toBeCloseTo(0.412, 3)
  })

  it("tells apart the poison, over 1 + √(5 × dose) s: Bonemass's punch, blocked", () => {
    const result = resolveHit(ironBuckler, hitOf({ blunt: 80, poison: 50 }), alone(), block)

    expect(result?.poison?.damage).toBeCloseTo(15.09, 2)
    expect(result?.poison?.seconds).toBe(9)
    expect(result?.taken).toBeCloseTo(39.24, 2)
  })

  it('leaves no spirit to a player who is immune to it, and burns it otherwise', () => {
    const immune: Defence = { ...silverShield, modifiers: { spirit: 'immune' } }

    expect(resolveHit(immune, hitOf({ spirit: 80 }), alone(), block)?.spirit).toBeNull()
    expect(resolveHit(silverShield, hitOf({ spirit: 80 }), alone(), block)?.spirit?.seconds).toBe(3)
  })

  it("puts the stagger limit at the player's share of max health", () => {
    const sturdier: Defence = { ...silverShield, staggerFactor: 0.5 }

    expect(resolveHit(sturdier, hitOf({ blunt: 90 }), alone(), block)?.bar.limit).toBe(75)
  })

  it("charges the player's block drain, in proportion to the power used", () => {
    const costlier: Defence = { ...silverShield, blockStaminaDrain: 20 }

    expect(resolveHit(costlier, hitOf({ blunt: 90 }), alone(), block)?.stamina).toBeCloseTo(
      16.05,
      2,
    )
  })
})

describe("resolveHit, along the game's roll", () => {
  const bite = hitOf({ pierce: 120 })

  it('multiplies the hit an attack builds by the roll: the bite parried at its lowest', () => {
    const result = resolveHit(ironBuckler, bite, alone(), { ...parry, roll: LOWEST_ROLL })

    expect(result?.received).toBeCloseTo(103.92, 2)
    expect(result?.taken).toBeCloseTo(3.26, 2)
    expect((result?.bar.shield ?? 0) + (result?.bar.armor ?? 0)).toBeCloseTo(28.26, 2)
  })

  it('takes the top of the roll when given none', () => {
    expect(resolveHit(ironBuckler, bite, alone(), parry)?.received).toBe(120)
  })

  it('rolls true damage with the rest', () => {
    const result = resolveHit(silverShield, hitOf({}, { trueDamage: 10 }), alone(), {
      ...block,
      roll: 0.9,
    })

    expect(result?.taken).toBeCloseTo(9, 6)
  })

  it('never rolls a hit with its own damage', () => {
    const own = hitOf({ blunt: 90 }, { scaling: 'world' })

    expect(resolveHit(silverShield, own, alone(), { ...block, roll: LOWEST_ROLL })?.received).toBe(
      90,
    )
  })
})

describe('resolveHit, with the gear and effects of the player', () => {
  const bite = hitOf({ pierce: 120 })

  it('breaks the block of the bite and takes it whole, for the whole drain', () => {
    const result = resolveHit(ironBuckler, bite, alone(), block)

    expect(result?.verdict).toBe('broken')
    expect(result?.taken).toBe(72)
    expect(result?.stamina).toBe(10)
  })

  it('parries the bite for 5.8, the bar at 39.1 of 56', () => {
    const result = resolveHit(ironBuckler, bite, alone(), parry)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(5.787, 3)
    expect((result?.bar.shield ?? 0) + (result?.bar.armor ?? 0)).toBeCloseTo(39.12, 2)
  })

  it('lets a resistance lower what passes the guard, never the guard: the Root Harnesk', () => {
    const harnesk: Defence = { ...ironBuckler, modifiers: { pierce: 'resistant' } }
    const blocked = resolveHit(harnesk, bite, alone(), block)

    expect(blocked?.verdict).toBe('broken')
    expect(blocked?.taken).toBeCloseTo(18.75, 6)
    expect(resolveHit(harnesk, bite, alone(), parry)?.taken).toBeCloseTo(1.447, 3)
  })

  it("halves both parts of the bar under Fader's power, so the blocked bite holds", () => {
    const fader: Defence = { ...ironBuckler, staggerModifier: -0.5 }
    const result = resolveHit(fader, bite, alone(), block)

    expect(result?.verdict).toBe('holds')
    expect(result?.taken).toBeCloseTo(30.72, 6)
    expect(result?.bar.shield).toBeCloseTo(38.4, 6)
    expect(result?.bar.armor).toBeCloseTo(15.36, 6)
  })

  it("takes the pieces' share off a block's stamina: 8 with the Ashen Cape", () => {
    const ashenCape: Defence = { ...ironBuckler, blockStaminaGear: -0.2 }

    expect(resolveHit(ashenCape, bite, alone(), block)?.stamina).toBeCloseTo(8, 6)
  })

  it("then takes each effect's share of that cost: 2 under the Berserkir Mead, 4 with the cape and the Evasion Mantle", () => {
    const berserkir: Defence = { ...ironBuckler, blockStaminaEffects: -0.8 }
    const capeAndMantle: Defence = {
      ...ironBuckler,
      blockStaminaGear: -0.2,
      blockStaminaEffects: -0.5,
    }

    expect(resolveHit(berserkir, bite, alone(), block)?.stamina).toBeCloseTo(2, 6)
    expect(resolveHit(capeAndMantle, bite, alone(), block)?.stamina).toBeCloseTo(4, 6)
  })

  it("gives stamina back below zero under Bonemass's power: 5 on a block, 10 on a parry that holds", () => {
    const bonemass: Defence = { ...ironBuckler, blockStaminaEffects: -1, blockStaminaFlat: -5 }

    expect(resolveHit(bonemass, bite, alone(), block)?.stamina).toBeCloseTo(-5, 6)
    expect(resolveHit(bonemass, bite, alone(), parry)?.stamina).toBeCloseTo(-10, 6)
  })

  it('gives the flat amount back once only on a parry that breaks', () => {
    const bonemass: Defence = { ...ironBuckler, blockStaminaEffects: -1, blockStaminaFlat: -5 }
    const result = resolveHit(bonemass, bite, alone(), { ...parry, barBefore: 0.5 })

    expect(result?.verdict).toBe('broken')
    expect(result?.stamina).toBeCloseTo(-5, 6)
  })

  it("gives the item's refund on a parry that holds instead of the flat amount again", () => {
    const torchUnderBonemass: Defence = {
      ...ironBuckler,
      parryStaminaRegen: 10,
      blockStaminaEffects: -1,
      blockStaminaFlat: -5,
    }

    expect(resolveHit(torchUnderBonemass, bite, alone(), parry)?.stamina).toBeCloseTo(-15, 6)
  })

  it("charges a parry's own drain twice when it holds, the pieces' share taken off the second time", () => {
    // The Player prefab's parry costs nothing in 1.0.21; with a drain, the game would charge
    // 5 × (1 − 0.2), then 5 × (1 + 0.2).
    const costlyParry: Defence = { ...ironBuckler, parryStaminaDrain: 5, blockStaminaGear: -0.2 }

    expect(resolveHit(costlyParry, bite, alone(), parry)?.stamina).toBeCloseTo(10, 6)
  })
})
