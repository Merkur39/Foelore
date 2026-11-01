import { describe, expect, it } from 'vitest'
import { attackDamage, attackVerdicts, hardestHit, hardestRange, type AttackHit } from './attack'
import type { Defence } from './block'
import type { World } from './world'

// Stagger limit 40: blunt 10 holds, 40 holds at 0★ but staggers at 2★, 200 breaks the block.
const defence: Defence = {
  blockPower: 50,
  parryPower: 75,
  armor: 0,
  maxHealth: 100,
  staggerFactor: 0.4,
  blockStaminaDrain: 10,
  parryStaminaDrain: 0,
  overTime: {
    burning: { ttl: 5, interval: 1 },
    spirit: { ttl: 3, interval: 0.5 },
    poison: { baseTtl: 1, ttlPerDamage: 5, ttlPower: 0.5, interval: 1 },
  },
}
const world: World = { difficulty: 'normal', players: 1 }
const blunt = (damage: number, rest: Partial<AttackHit> = {}): AttackHit => ({
  damages: { blunt: damage },
  staggerMultiplier: 1,
  blockable: true,
  dodgeable: true,
  ...rest,
})

describe('attackVerdicts', () => {
  it('takes, for each guard, the worst verdict among the hits of the attack', () => {
    expect(attackVerdicts(defence, [blunt(10), blunt(200)], world, 0)).toEqual({
      block: 'broken',
      parry: 'broken',
      dodgeable: true,
    })
  })

  it('cannot guard an attack one of whose hits is unblockable', () => {
    expect(
      attackVerdicts(defence, [blunt(10), blunt(10, { blockable: false })], world, 0),
    ).toMatchObject({
      block: 'unblockable',
      parry: 'unblockable',
    })
  })

  it('leaves the parry out when the item cannot parry', () => {
    expect(attackVerdicts({ ...defence, parryPower: null }, [blunt(10)], world, 0)).toMatchObject({
      block: 'holds',
      parry: null,
    })
  })

  it('lets a roll avoid the attack only when it avoids every hit', () => {
    expect(
      attackVerdicts(defence, [blunt(10), blunt(10, { dodgeable: false })], world, 0),
    ).toMatchObject({
      dodgeable: false,
    })
  })

  it('weighs the hits at the stars of the creature', () => {
    expect(attackVerdicts(defence, [blunt(40)], world, 0)?.block).toBe('holds')
    expect(attackVerdicts(defence, [blunt(40)], world, 2)?.block).toBe('staggered')
  })

  it('has nothing to guard against in an attack that only summons', () => {
    expect(attackVerdicts(defence, [], world, 0)).toBeNull()
  })
})

describe('hardestHit', () => {
  const block = { guard: 'block', stars: 0, barBefore: 0 } as const

  it('resolves the hit with the worst verdict', () => {
    expect(hardestHit(defence, [blunt(10), blunt(200)], world, block)).toMatchObject({
      verdict: 'broken',
      received: 200,
    })
  })

  it('between hits of one verdict, resolves the one that hurts most', () => {
    expect(hardestHit(defence, [blunt(12), blunt(10)], world, block)).toMatchObject({
      verdict: 'holds',
      received: 12,
    })
  })

  it('resolves every hit from the bar the options give', () => {
    expect(hardestHit(defence, [blunt(70)], world, block)?.verdict).toBe('staggered')
    expect(hardestHit(defence, [blunt(70)], world, { ...block, barBefore: 0.5 })?.verdict).toBe(
      'broken',
    )
  })

  it('has nothing to resolve when the item cannot parry, or the attack only summons', () => {
    expect(
      hardestHit({ ...defence, parryPower: null }, [blunt(10)], world, {
        ...block,
        guard: 'parry',
      }),
    ).toBeNull()
    expect(hardestHit(defence, [], world, block)).toBeNull()
  })
})

// Blocked, a blunt hit H passes H² / 200 twice, shield and armor: it staggers from 63.2, breaks from 89.4.
describe('hardestRange', () => {
  const block = { guard: 'block', stars: 0, barBefore: 0 } as const

  it('resolves the hit at the lowest roll and at the top', () => {
    const range = hardestRange(defence, [blunt(10)], world, block)

    expect(range?.low.taken).toBeCloseTo(0.375, 6)
    expect(range?.top.taken).toBeCloseTo(0.5, 6)
    expect(range?.rolled).toBe(true)
    expect(range?.odds).toBe(1)
  })

  it("gives the share of the rolls that end in the top's verdict when the roll changes it", () => {
    const range = hardestRange(defence, [blunt(70)], world, block)

    expect(range?.low.verdict).toBe('holds')
    expect(range?.top.verdict).toBe('staggered')
    // The roll is √U, U even over [0.75, 1]: it staggers from 63.25 / 70 on.
    expect(range?.odds).toBeCloseTo((1 - (Math.sqrt(4000) / 70) ** 2) / 0.25, 6)
  })

  it('keeps a hit with its own damage at one point', () => {
    const range = hardestRange(defence, [blunt(70, { scaling: 'world' })], world, block)

    expect(range?.rolled).toBe(false)
    expect(range?.low).toEqual(range?.top)
    expect(range?.odds).toBe(1)
  })

  it('ranges the hit of the attack the guard fares worst against', () => {
    const range = hardestRange(defence, [blunt(10), blunt(70)], world, block)

    expect(range?.top.received).toBe(70)
  })

  it('has nothing to range with an item that cannot parry', () => {
    const tower: Defence = { ...defence, parryPower: null }

    expect(hardestRange(tower, [blunt(10)], world, { ...block, guard: 'parry' })).toBeNull()
  })
})

describe('attackDamage', () => {
  it('lists the largest hit of the attack, the stars counted where the game counts them', () => {
    const slam = [blunt(60, { scaling: 'attack' }), blunt(50, { scaling: 'world' })]

    expect(attackDamage(slam, 0)).toBe(60)
    expect(attackDamage(slam, 2)).toBe(120)
  })

  it('counts true damage, which only the stars scale', () => {
    expect(attackDamage([{ ...blunt(0), damages: {}, trueDamage: 10 }], 1)).toBe(15)
    expect(attackDamage([{ ...blunt(0), damages: {}, trueDamage: 10, scaling: 'none' }], 1)).toBe(
      10,
    )
  })

  it('lists nothing for an attack that only summons', () => {
    expect(attackDamage([], 0)).toBeNull()
  })
})
