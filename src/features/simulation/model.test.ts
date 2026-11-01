import { describe, expect, it } from 'vitest'
import { game } from '@/data'
import {
  findAttack,
  oddsFraction,
  refOf,
  simulableCount,
  simulationRoute,
  withRecent,
} from './model'

const slam = { fighter: 'Troll', attack: 'troll_groundslam' }
const punch = { fighter: 'Troll', attack: 'troll_punch' }
const kick = { fighter: 'Boar', attack: 'boar_base_attack' }

describe('oddsFraction', () => {
  it('says a share as the simplest « n in q » that falls within 3 points of it', () => {
    expect(oddsFraction(0.7468)).toEqual([3, 4])
    expect(oddsFraction(0.359)).toEqual([1, 3])
    expect(oddsFraction(0.1317)).toEqual([1, 7])
  })

  it('takes the nearest when none falls that close, q up to 10', () => {
    expect(oddsFraction(0.02)).toEqual([1, 10])
    expect(oddsFraction(0.97)).toEqual([9, 10])
  })
})

describe('withRecent', () => {
  it('puts the attack just simulated first, and keeps two', () => {
    expect(withRecent([punch, kick], slam)).toEqual([slam, punch])
  })

  it('never lists an attack twice', () => {
    expect(withRecent([punch, slam], slam)).toEqual([slam, punch])
  })
})

describe('findAttack', () => {
  it('finds an attack by its creature and its item', () => {
    expect(findAttack(slam)).toMatchObject({
      creature: { id: 'Troll' },
      fighter: { id: 'Troll' },
      attack: { name: { fr: 'Frappe au sol' } },
    })
  })

  it('finds the attack of a boss phase, with the boss it belongs to', () => {
    const phase = game.creatures.find((c) => c.id === 'FrozenKing')!.phases!.at(-1)!
    const attack = phase.attacks.find((a) => a.hits.length > 0)!

    expect(findAttack({ fighter: phase.id, attack: attack.ids[0]! })).toMatchObject({
      creature: { id: 'FrozenKing' },
      fighter: { id: phase.id },
    })
  })

  it('finds nothing for an attack the data lacks, or one that only summons', () => {
    const summoner = game.creatures.find((c) => c.attacks.some((a) => a.hits.length === 0))!
    const summon = summoner.attacks.find((a) => a.hits.length === 0)!

    expect(findAttack({ fighter: 'Troll', attack: 'nothing' })).toBeNull()
    expect(findAttack({ fighter: summoner.id, attack: summon.ids[0]! })).toBeNull()
  })
})

describe('simulationRoute', () => {
  it('writes the attack in the address, and reads it back', () => {
    expect(simulationRoute(slam)).toMatchObject({
      screen: 'simulation',
      path: ['Troll', 'troll_groundslam'],
    })
    expect(refOf(simulationRoute(slam))).toEqual(slam)
    expect(refOf(simulationRoute(null))).toBeNull()
  })
})

describe('simulableCount', () => {
  it('counts the attacks of a creature that deal something, every phase included', () => {
    const troll = game.creatures.find((c) => c.id === 'Troll')!

    expect(simulableCount(troll)).toBe(5)
  })
})
