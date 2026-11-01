import { describe, expect, it } from 'vitest'
import { effectOf } from '@/features/gear/carried'
import { gearDefence } from './context'
import type { Gear } from './store'

const silver: Gear = { blocker: 'ShieldSilver', level: 3, skill: 25, armor: 0, maxHealth: 150 }

describe('gearDefence', () => {
  it('counts the armor and the resistances of the pieces worn', () => {
    const defence = gearDefence({
      ...silver,
      pieces: {
        helmet: { id: 'HelmetIron', level: 1 },
        chest: { id: 'ArmorIronChest', level: 1 },
        legs: { id: 'ArmorIronLegs', level: 1 },
        cape: { id: 'CapeWolf', level: 3 },
      },
    })

    expect(defence.armor).toBe(45)
    expect(defence.modifiers).toEqual({ spirit: 'immune', frost: 'resistant' })
  })

  it("counts a complete set's bonus, which is worn, not carried", () => {
    const defence = gearDefence({
      ...silver,
      pieces: {
        helmet: { id: 'HelmetFenring', level: 1 },
        chest: { id: 'ArmorFenringChest', level: 1 },
        legs: { id: 'ArmorFenringLegs', level: 1 },
      },
    })

    expect(defence.modifiers).toEqual({ spirit: 'immune', frost: 'resistant', fire: 'resistant' })
  })

  it('stacks two powers on at once as the game does: resistances merged, stagger summed', () => {
    const defence = gearDefence({ ...silver, armor: 45 }, [
      effectOf('GP_Bonemass'),
      effectOf('GP_Fader'),
    ])

    expect(defence.modifiers).toEqual({
      spirit: 'immune',
      blunt: 'slightlyResistant',
      slash: 'slightlyResistant',
      pierce: 'slightlyResistant',
      fire: 'resistant',
    })
    expect(defence.staggerModifier).toBe(-0.5)
  })

  it("keeps an earlier player's typed armor while they wear no piece", () => {
    expect(gearDefence({ ...silver, armor: 45 }).armor).toBe(45)
  })

  it('leaves out what is carried until it is switched on', () => {
    const carrying: Gear = {
      ...silver,
      carried: { trinket: 'TrinketIronHealth', power: 'GP_Bonemass', drinks: [], group: [] },
    }

    expect(gearDefence(carrying)).toEqual(gearDefence(silver))
  })

  it('counts each effect switched on: armor, resistances and what a guard costs', () => {
    const defence = gearDefence({ ...silver, armor: 45 }, [
      effectOf('TrinketIronHealth'),
      effectOf('GP_Bonemass'),
    ])

    expect(defence.armor).toBe(65)
    expect(defence.modifiers).toEqual({
      spirit: 'immune',
      blunt: 'slightlyResistant',
      slash: 'slightlyResistant',
      pierce: 'slightlyResistant',
    })
    expect(defence.blockStaminaEffects).toBe(-1)
    expect(defence.blockStaminaFlat).toBe(-5)
  })
})
