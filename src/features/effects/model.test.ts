import { describe, expect, it } from 'vitest'
import type { Gear } from '@/app/store'
import type { Hit } from '@/combat/hit'
import { game } from '@/data'
import { fightersOf } from '@/features/bestiary/model'
import { effectOf } from '@/features/gear/carried'
import { MOCKUP_GEAR, MOCKUP_PIECES } from '../../../test/utils'
import { creatureHits, idleOf } from './model'

const creature = (id: string) => {
  const found = game.creatures.find((candidate) => candidate.id === id)
  if (!found) throw new Error(id)
  return found
}
const attackHits = (id: string, attack: string) =>
  fightersOf(creature(id))
    .flatMap((fighter) => fighter.attacks)
    .find((candidate) => candidate.ids[0] === attack)?.hits ?? []

const world = { difficulty: 'normal', players: 1 } as const
// The mockups' gear: iron and the wolf cape, which resists frost.
const worn: Gear = { ...MOCKUP_GEAR, armor: 0, pieces: MOCKUP_PIECES }
const bare: Gear = { ...MOCKUP_GEAR, armor: 0, pieces: {} }
const against = (gear: Gear, hits: readonly Hit[], on: string[] = []) => ({
  gear,
  on: on.map(effectOf),
  hits,
  world,
  stars: 0,
})

describe('idleOf', () => {
  it('finds that an effect changes something: the Iron Brooch against the Troll', () => {
    expect(
      idleOf(effectOf('TrinketIronHealth'), against(worn, creatureHits(creature('Troll')))),
    ).toBeNull()
  })

  it('says a power that changes no hit changes none here either: Eikthyr against the Troll', () => {
    expect(idleOf(effectOf('GP_Eikthyr'), against(worn, creatureHits(creature('Troll'))))).toEqual({
      kind: 'noHit',
    })
  })

  it('says it changes nothing against a creature that deals none of its types', () => {
    expect(
      idleOf(effectOf('Potion_barleywine'), against(worn, creatureHits(creature('Troll')))),
    ).toEqual({ kind: 'notDealt', types: ['fire'] })
  })

  it("names the piece that already resists: the wolf cape against Moder's Cold breath", () => {
    expect(
      idleOf(
        effectOf('Potion_frostresist'),
        against(worn, attackHits('Dragon', 'dragon_coldbreath')),
      ),
    ).toEqual({ kind: 'resisted', by: { kind: 'piece', slot: 'cape' } })
  })

  it('counts the frost mead without the cape, and gives way to a power switched on', () => {
    const breath = attackHits('Dragon', 'dragon_coldbreath')

    expect(idleOf(effectOf('Potion_frostresist'), against(bare, breath))).toBeNull()
    expect(idleOf(effectOf('Potion_frostresist'), against(bare, breath, ['GP_Moder']))).toEqual({
      kind: 'resisted',
      by: { kind: 'power' },
    })
  })

  it("names the group's power that already resists: Fader's against a Fuling shaman", () => {
    const group: Gear = {
      ...worn,
      carried: { trinket: null, power: null, drinks: ['Potion_barleywine'], group: ['GP_Fader'] },
    }

    expect(
      idleOf(
        effectOf('Potion_barleywine'),
        against(group, creatureHits(creature('GoblinShaman')), ['GP_Fader']),
      ),
    ).toEqual({ kind: 'resisted', by: { kind: 'group', id: 'GP_Fader' } })
  })

  it('names Wet, in the rain, as already resisting: the fire mead against a Fuling shaman', () => {
    const shaman = creatureHits(creature('GoblinShaman'))
    const dry = against(worn, shaman)

    expect(idleOf(effectOf('Potion_barleywine'), dry)).toBeNull()
    expect(idleOf(effectOf('Potion_barleywine'), { ...dry, wet: true })).toEqual({
      kind: 'resisted',
      by: { kind: 'weather' },
    })
  })

  it("names a complete set's bonus: the Fenris blessing against a Cultist's Flames", () => {
    const fenris: Gear = {
      ...bare,
      pieces: {
        helmet: { id: 'HelmetFenring', level: 1 },
        chest: { id: 'ArmorFenringChest', level: 1 },
        legs: { id: 'ArmorFenringLegs', level: 1 },
      },
    }

    expect(
      idleOf(
        effectOf('Potion_barleywine'),
        against(fenris, attackHits('Fenring_Cultist', 'Fenring_attack_flames')),
      ),
    ).toEqual({ kind: 'resisted', by: { kind: 'set' } })
  })

  it('tells of an effect switched on that another makes useless, which still does more itself', () => {
    const hits = creatureHits(creature('Troll'))
    const on = ['TrinketSilverResist', 'GP_Bonemass']

    expect(idleOf(effectOf('TrinketSilverResist'), against(worn, hits, on))).toEqual({
      kind: 'resisted',
      by: { kind: 'power' },
    })
    expect(idleOf(effectOf('GP_Bonemass'), against(worn, hits, on))).toBeNull()
  })
})

describe('creatureHits', () => {
  it('takes every phase, and what hits apart from the attacks: trampling and death', () => {
    const lox = creature('Lox')

    expect(creatureHits(lox)).toEqual([
      ...lox.attacks.flatMap((attack) => attack.hits),
      ...(lox.trample?.hits ?? []),
    ])
  })
})
