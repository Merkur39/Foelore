import { describe, expect, it } from 'vitest'
import { carriable, carriedEffects, changesNoHit, NOTHING_CARRIED } from './carried'

describe('changesNoHit', () => {
  it("tells Eikthyr's and The Elder's powers, nothing of which reaches a hit", () => {
    expect(
      carriable('power')
        .filter(changesNoHit)
        .map(({ id }) => id),
    ).toEqual(['GP_Eikthyr', 'GP_TheElder'])
  })
})

describe('carriable', () => {
  it('lists the seven powers in the order their bosses fall', () => {
    expect(carriable('power').map(({ id }) => id)).toEqual([
      'GP_Eikthyr',
      'GP_TheElder',
      'GP_Bonemass',
      'GP_Moder',
      'GP_Yagluth',
      'GP_Queen',
      'GP_Fader',
    ])
  })

  it('lists the trinkets and the drinks that change a fight, as the mockups do', () => {
    expect(carriable('trinket').map(({ name }) => name.fr)).toEqual([
      'Broche en fer',
      'Perce-cou',
      'Cœur de cristal',
      "Voile d'ombre",
    ])
    expect(carriable('consumable').map(({ name }) => name.fr)).toEqual([
      'Hydromel de résistance au gel',
      "Vin d'orge de résistance au feu",
      'Hydromel de résistance au poison',
      'Hydromel des berserkir',
    ])
  })
})

describe('carriedEffects', () => {
  it("lists what is carried as the sheet does: the trinket, the power, the drinks, the group's", () => {
    const carried = {
      trinket: 'TrinketIronHealth',
      power: 'GP_Bonemass',
      drinks: ['Potion_frostresist', 'Potion_barleywine'],
      group: ['GP_Fader', 'GP_Moder'],
    }

    expect(carriedEffects(carried).map(({ id }) => id)).toEqual([
      'TrinketIronHealth',
      'GP_Bonemass',
      'Potion_frostresist',
      'Potion_barleywine',
      'GP_Fader',
      'GP_Moder',
    ])
  })

  it('lists nothing when nothing is carried', () => {
    expect(carriedEffects(NOTHING_CARRIED)).toEqual([])
    expect(
      carriedEffects({ trinket: null, power: 'GP_Moder', drinks: [], group: [] }),
    ).toHaveLength(1)
  })
})
