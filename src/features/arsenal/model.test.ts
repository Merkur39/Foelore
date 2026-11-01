import { describe, expect, it } from 'vitest'
import { blockerOf } from '@/app/context'
import { game } from '@/data'
import { NOTHING_CARRIED } from '@/features/gear/carried'
import { MOCKUP_PIECES } from '../../../test/utils'
import {
  blockerRows,
  categoryOf,
  categorySize,
  effectRows,
  FAMILIES,
  pieceRows,
  searchArsenal,
} from './model'

const ids = (rows: readonly { readonly id: string }[]) => rows.map(({ id }) => id)

describe('the categories', () => {
  it('come in the three families of Your gear: in hand, armor pieces, what you carry', () => {
    expect(FAMILIES).toEqual([
      { id: 'hand', categories: ['shields', 'weapons', 'others'] },
      { id: 'armor', categories: ['helmets', 'chests', 'legs', 'capes'] },
      { id: 'carry', categories: ['powers', 'trinkets', 'drinks'] },
    ])
  })

  it('sort shields, weapons and the rest apart, and leave out what is thrown away', () => {
    expect(categoryOf(blockerOf('ShieldGoldBuckler'))).toBe('shields')
    expect(categoryOf(blockerOf('ShieldWoodTower'))).toBe('shields')
    expect(categoryOf(blockerOf('AtgeirGold'))).toBe('weapons')
    expect(categoryOf(blockerOf('Torch'))).toBe('others')
    expect(categoryOf(blockerOf('PlayerUnarmed'))).toBe('others')
    expect(categoryOf(blockerOf('BombOoze'))).toBeNull()
  })

  it('count what each holds', () => {
    expect(categorySize('capes')).toBe(
      game.armorPieces.filter(({ slot }) => slot === 'cape').length,
    )
    expect(categorySize('powers')).toBe(7)
    expect(categorySize('drinks')).toBe(4)
  })
})

describe('blockerRows', () => {
  const mockup = { skill: 25, equipped: 'ShieldSilver', sort: 'power' } as const

  it('gives each item at level 1 and your skill, the one you hold first', () => {
    const rows = blockerRows('shields', mockup)

    expect(rows[0]).toMatchObject({
      id: 'ShieldSilver',
      power: 67.5,
      parry: 101.25,
      equipped: true,
    })
    const powers = rows.slice(1).map(({ power }) => power)
    expect(powers).toEqual(powers.toSorted((a, b) => b - a))
  })

  it('has no parry for an item that cannot parry, and sorts it last by parry', () => {
    const rows = blockerRows('shields', { ...mockup, equipped: 'None', sort: 'parry' })

    expect(rows.find(({ id }) => id === 'ShieldWoodTower')?.parry).toBeNull()
    expect(rows.at(-1)?.parry).toBeNull()
  })

  it('leaves out what is thrown away', () => {
    expect(ids(blockerRows('weapons', mockup))).not.toContain('BombOoze')
  })
})

describe('pieceRows', () => {
  it('gives each piece its armor at level 1 and what a level adds, the pieces worn first', () => {
    const rows = pieceRows('helmets', MOCKUP_PIECES)

    expect(rows[0]).toMatchObject({ id: 'HelmetIron', armor: 14, perLevel: 2, equipped: true })
    const armors = rows.slice(1).map(({ armor }) => armor)
    expect(armors).toEqual(armors.toSorted((a, b) => b - a))
  })

  it('names the set whose bonus changes a fight', () => {
    const hood = pieceRows('helmets', {}).find(({ id }) => id === 'HelmetFenring')

    expect(hood?.set?.id).toBe('SetEffect_FenringArmor')
    expect(pieceRows('helmets', {}).find(({ id }) => id === 'HelmetIron')?.set).toBeNull()
  })
})

describe('effectRows', () => {
  it('lists the powers in the order the bosses fall, what you carry first', () => {
    expect(ids(effectRows('powers', NOTHING_CARRIED))).toEqual([
      'GP_Eikthyr',
      'GP_TheElder',
      'GP_Bonemass',
      'GP_Moder',
      'GP_Yagluth',
      'GP_Queen',
      'GP_Fader',
    ])
    const carrying = { ...NOTHING_CARRIED, power: 'GP_Yagluth' }
    expect(effectRows('powers', carrying)[0]).toMatchObject({ id: 'GP_Yagluth', carried: true })
  })

  it("lists your power first, then the group's, then the others", () => {
    const carrying = { ...NOTHING_CARRIED, power: 'GP_Yagluth', group: ['GP_Fader', 'GP_Moder'] }

    expect(
      effectRows('powers', carrying).map(({ id, carried, group }) => [id, carried, group]),
    ).toEqual([
      ['GP_Yagluth', true, false],
      ['GP_Moder', false, true],
      ['GP_Fader', false, true],
      ['GP_Eikthyr', false, false],
      ['GP_TheElder', false, false],
      ['GP_Bonemass', false, false],
      ['GP_Queen', false, false],
    ])
  })

  it('lists the trinkets and the drinks as Your gear does', () => {
    expect(ids(effectRows('trinkets', NOTHING_CARRIED))).toEqual([
      'TrinketIronHealth',
      'TrinketBloodGoldHealth',
      'TrinketSilverResist',
      'TrinketBlackStamina',
    ])
    expect(
      effectRows('drinks', { ...NOTHING_CARRIED, drinks: ['Potion_bzerker'] }).map(
        ({ id, carried }) => [id, carried],
      ),
    ).toEqual([
      ['Potion_bzerker', true],
      ['Potion_frostresist', false],
      ['Potion_barleywine', false],
      ['Potion_poisonresist', false],
    ])
  })
})

describe('searchArsenal', () => {
  const searchFor = (query: string) =>
    searchArsenal(query, 'fr', {
      skill: 25,
      equipped: 'ShieldSilver',
      pieces: {},
      carried: NOTHING_CARRIED,
    })

  it('finds a name in every category, accents and case aside, by family', () => {
    const found = searchFor('FER')

    expect(found.map(({ category }) => category)).toEqual([
      'shields',
      'weapons',
      'helmets',
      'chests',
      'legs',
      'trinkets',
    ])
    expect(ids(found.find(({ category }) => category === 'trinkets')?.rows ?? [])).toEqual([
      'TrinketIronHealth',
    ])
    expect(searchFor('écu').length).toBeGreaterThan(0)
  })

  it('finds nothing for an empty search', () => {
    expect(searchFor('  ')).toEqual([])
  })
})
