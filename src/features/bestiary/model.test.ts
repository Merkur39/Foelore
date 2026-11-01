import { describe, expect, it } from 'vitest'
import { gearDefence } from '@/app/context'
import { DEFAULT_STATE } from '@/app/store'
import type { Defence } from '@/combat/block'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type { GameAttack, GameCreature, GameHit } from '@/data/types'
import {
  assess,
  attackTypes,
  creatureName,
  creaturesOf,
  matchRange,
  modifierRows,
  modifiersOf,
  search,
} from './model'

// Stagger limit 40: blunt 10 holds; 70 staggers a block but a parry holds it; 200 breaks both.
const defence: Defence = {
  blockPower: 50,
  parryPower: 75,
  armor: 0,
  maxHealth: 100,
  staggerFactor: 0.4,
  blockStaminaDrain: 10,
  parryStaminaDrain: 0,
  overTime: game.player.overTime,
}
const world: World = { difficulty: 'normal', players: 1 }

const hit = (blunt: number, rest: Partial<GameHit> = {}): GameHit => ({
  damages: { blunt },
  staggerMultiplier: 1,
  blockable: true,
  dodgeable: true,
  scaling: 'attack',
  source: 'weapon',
  ...rest,
})
const attack = (name: string, hits: GameHit[]): GameAttack => ({
  ids: [name],
  name: { fr: name, en: name },
  kind: hits.length === 0 ? 'summon' : 'melee',
  hits,
})
const creature = (attacks: GameAttack[], rest: Partial<GameCreature> = {}): GameCreature => ({
  id: 'Test',
  name: { fr: 'Test', en: 'Test' },
  boss: false,
  biomes: ['meadows'],
  stars: { min: 0, max: 2 },
  health: 100,
  staggerFactor: 0.5,
  staggerable: true,
  staggeredByParry: true,
  modifiers: {},
  attacks,
  ...rest,
})
const id = (thing: { readonly id: string }) => thing.id

describe('creaturesOf', () => {
  it('lists the creatures that live in a biome, in the order of the game data', () => {
    const blackForest = creaturesOf('blackForest').map(id)

    expect(blackForest).toEqual(expect.arrayContaining(['Greydwarf', 'Troll']))
    expect(blackForest).not.toContain('Boar')
    expect(blackForest.indexOf('Greydwarf')).toBeLessThan(blackForest.indexOf('Troll'))
  })

  it('leaves out no creature', () => {
    const listed = new Set(game.biomes.flatMap((biome) => creaturesOf(biome.id).map(id)))

    expect(game.creatures.filter((c) => !listed.has(c.id)).map(id)).toEqual([])
  })
})

describe('assess', () => {
  it('sums up a creature by the worst verdict of each guard among its attacks', () => {
    const assessment = assess(
      creature([attack('a', [hit(10)]), attack('b', [hit(70)])]),
      defence,
      world,
      0,
    )

    expect(assessment).toMatchObject({ block: 'staggered', parry: 'holds', dodgeable: true })
    expect(assessment.advice).toEqual({ kind: 'parryAll', block: 'staggered' })
  })

  it('lists the attacks of every phase of a boss, the creature first', () => {
    const boss = creature([attack('a', [hit(10)])], {
      phases: [{ ...creature([attack('b', [hit(10)])]), id: 'Phase2' }],
    })

    expect(assess(boss, defence, world, 0).attacks.map((a) => a.fighter.id)).toEqual([
      'Test',
      'Phase2',
    ])
  })

  it('leaves an attack that only summons out of the verdicts and the advice', () => {
    const assessment = assess(
      creature([attack('call', []), attack('bite', [hit(10)])]),
      defence,
      world,
      0,
    )

    expect(assessment.attacks[0]).toMatchObject({ damage: null, verdicts: null })
    expect(assessment.advice).toEqual({ kind: 'blockAll' })
  })

  it('has no advice for a creature that only summons', () => {
    expect(assess(creature([attack('call', [])]), defence, world, 0)).toMatchObject({
      block: null,
      dodgeable: null,
      advice: { kind: 'unknown' },
    })
  })

  it('names the attacks no guard takes, and whether a roll avoids them all', () => {
    const rolled = attack('slam', [hit(200)])
    const zone = attack('zone', [hit(200, { blockable: false, dodgeable: false })])

    const advice = assess(
      creature([attack('bite', [hit(10)]), rolled, zone]),
      defence,
      world,
      0,
    ).advice

    expect(advice).toMatchObject({ kind: 'dodgeSome', rest: 'block', rollsAvoid: false })
    expect(advice.kind === 'dodgeSome' && advice.dodge.map((a) => a.attack.name.fr)).toEqual([
      'slam',
      'zone',
    ])
  })

  it('leaves the parry out when the item cannot parry', () => {
    expect(
      assess(creature([attack('bite', [hit(10)])]), { ...defence, parryPower: null }, world, 0),
    ).toMatchObject({ parry: null, canParry: false })
  })

  it('assesses what hits apart from the attacks: trampling and what a death deals', () => {
    const lox = creature([attack('bite', [hit(10)])], {
      trample: { minSpeed: 5, hits: [hit(70, { scaling: 'world', ticks: { every: 4 } })] },
      onDeath: [hit(200, { blockable: false, scaling: 'none', source: 'aoe', radius: 6 })],
    })

    const [hazards] = assess(lox, defence, world, 2).hazards

    expect(hazards?.fighter).toBe(lox)
    expect(hazards?.trample).toMatchObject({
      damage: 70,
      verdicts: { block: 'staggered', parry: 'holds', dodgeable: true },
    })
    expect(hazards?.death).toMatchObject({
      damage: 200,
      verdicts: { block: 'unblockable', dodgeable: true },
    })
  })

  it('leaves trampling and death out of the advice', () => {
    const lox = creature([attack('bite', [hit(10)])], {
      trample: { minSpeed: 5, hits: [hit(200)] },
      onDeath: [hit(200, { blockable: false })],
    })

    expect(assess(lox, defence, world, 0)).toMatchObject({
      block: 'holds',
      advice: { kind: 'blockAll' },
    })
  })

  it('counts the creatures a death brings at the stars, and finds their sheet', () => {
    const oozer = creature([attack('zone', [hit(10)])], {
      deathSummons: [
        { id: 'Blob', name: { fr: 'Blob', en: 'Blob' }, min: 2, max: 2, doublesPerStar: true },
        { id: 'Nowhere', min: 1, max: 3 },
      ],
    })

    const summons = assess(oozer, defence, world, 1).hazards[0]?.summons

    expect(summons?.map(({ name, count, creature }) => [name.en, count, creature?.id])).toEqual([
      ['Blob', [4, 4], 'Blob'],
      ['Nowhere', [1, 3], undefined],
    ])
  })

  it('keeps the hazards of each phase with its phase, and none for a fighter without any', () => {
    const boss = creature([attack('a', [hit(10)])], {
      deathSummons: [{ id: 'Blob', min: 1, max: 1 }],
      phases: [{ ...creature([attack('b', [hit(10)])]), id: 'Phase2' }],
    })

    expect(assess(boss, defence, world, 0).hazards.map((h) => h.fighter.id)).toEqual(['Test'])
  })

  it('assesses every creature of the game, at every star it can have, with the default gear', () => {
    const gear = gearDefence(DEFAULT_STATE.gear)
    const assessed = game.creatures.flatMap((c) =>
      Array.from({ length: c.stars.max - c.stars.min + 1 }, (_, index) =>
        assess(c, gear, DEFAULT_STATE.world, c.stars.min + index),
      ),
    )

    expect(assessed.filter((a) => a.attacks.length === 0)).toEqual([])
    expect(assessed.filter((a) => a.advice.kind === 'unknown')).toEqual([])
  })
})

describe('search', () => {
  it('finds creatures and attacks by part of their name, whatever the case and the accents', () => {
    expect(search('aine', 'fr').creatures.map(id)).toContain('gd_king')
    expect(
      search('FRAPPE', 'fr').attacks.map(({ creature, attack }) => [creature.id, attack.name.fr]),
    ).toContainEqual(['Troll', 'Frappe au sol'])
  })

  it('searches the names of the language the interface speaks', () => {
    expect(search('ground slam', 'en').attacks.map((found) => found.creature.id)).toContain('Troll')
    expect(search('ground slam', 'fr').attacks).toEqual([])
  })

  it('finds nothing for an empty search', () => {
    expect(search('  ', 'fr')).toEqual({ creatures: [], attacks: [] })
  })
})

describe('attackTypes', () => {
  it('lists the damage types an attack deals, the largest first', () => {
    const fireball = attack('fireball', [
      hit(0, { damages: { blunt: 10, fire: 30 } }),
      hit(0, { damages: { fire: 5, pierce: 0 } }),
    ])

    expect(attackTypes(fireball)).toEqual(['fire', 'blunt'])
  })
})

describe('modifiersOf', () => {
  it('lists how a creature takes each type it does not take normally, its weaknesses first', () => {
    expect(
      modifiersOf({ blunt: 'resistant', fire: 'normal', pierce: 'weak', spirit: 'immune' }),
    ).toEqual([
      { type: 'pierce', modifier: 'weak', multiplier: 1.5 },
      { type: 'blunt', modifier: 'resistant', multiplier: 0.5 },
      { type: 'spirit', modifier: 'immune', multiplier: 0 },
    ])
  })

  it('shows the tools a creature takes among the types, a tool taken normally without a word', () => {
    expect(
      modifiersOf({ fire: 'weak', blunt: 'resistant' }, { chop: 'normal', pickaxe: 'veryWeak' }),
    ).toEqual([
      { type: 'pickaxe', modifier: 'veryWeak', multiplier: 2 },
      { type: 'fire', modifier: 'weak', multiplier: 1.5 },
      { type: 'chop', modifier: null, multiplier: 1 },
      { type: 'blunt', modifier: 'resistant', multiplier: 0.5 },
    ])
  })
})

describe('creatureName', () => {
  const named = (id: string, language: 'fr' | 'en') =>
    creatureName(
      game.creatures.find((c) => c.id === id)!,
      language,
    )

  it("sets a creature apart by the biome it comes from, in the game's words", () => {
    expect(named('Skeleton_Swamps', 'fr')).toBe('Squelette · Marécages')
    expect(named('Skeleton_Mountains', 'en')).toBe('Skeleton · Mountain')
  })

  it("keeps the game's name alone for a creature without origin", () => {
    expect(named('Skeleton', 'fr')).toBe('Squelette')
  })
})

describe('modifierRows', () => {
  it('gives the body its row, then each weak spot its own, by the name of the part', () => {
    const troll = game.creatures.find((c) => c.id === 'Troll')!

    expect(modifierRows(troll).map(({ part, modifiers }) => [part?.fr ?? null, modifiers])).toEqual(
      [
        [
          null,
          [
            { type: 'pierce', modifier: 'weak', multiplier: 1.5 },
            { type: 'blunt', modifier: 'resistant', multiplier: 0.5 },
            { type: 'spirit', modifier: 'immune', multiplier: 0 },
          ],
        ],
        [
          'Tête',
          [
            { type: 'pierce', modifier: 'veryWeak', multiplier: 2 },
            { type: 'spirit', modifier: 'immune', multiplier: 0 },
          ],
        ],
      ],
    )
  })

  it('has the body alone for a creature without weak spot', () => {
    expect(modifierRows(creature([], { modifiers: { fire: 'weak' } }))).toEqual([
      { part: null, modifiers: [{ type: 'fire', modifier: 'weak', multiplier: 1.5 }] },
    ])
  })
})

describe('matchRange', () => {
  it('places the search in the name, accents and case aside', () => {
    expect(matchRange("L'Aîné", 'AINE')).toEqual([2, 6])
    expect(matchRange('Troll', 'x')).toBeNull()
  })
})
