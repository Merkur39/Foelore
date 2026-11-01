import { describe, expect, it } from 'vitest'
import { defenceOf } from '@/combat/block'
import { damageMultiplier, type DamageModifier } from '@/combat/modifiers'
import { DAMAGE_TYPES } from '@/combat/damage'
import { barrierTakes, resolveHit } from '@/combat/hit'
import { worldScale } from '@/combat/world'
import { game } from '.'

const biomeIds = new Set(game.biomes.map((biome) => biome.id))
const fighters = game.creatures.flatMap((c) => [c, ...(c.phases ?? [])])
const attacks = fighters.flatMap((f) => f.attacks)
const hits = [
  ...attacks.flatMap((a) => a.hits),
  ...fighters.flatMap((f) => [...(f.onDeath ?? []), ...(f.trample?.hits ?? [])]),
]
const summons = [
  ...attacks.flatMap((a) => a.summons ?? []),
  ...fighters.flatMap((f) => f.deathSummons ?? []),
]
const statusEffects = Object.values(game.statusEffects)
const names = [
  ...game.biomes.map((b) => b.name),
  ...Object.values(game.damageTypes),
  ...Object.values(game.toolTypes),
  ...Object.values(game.modifiers),
  ...game.world.presets.flatMap((p) => [p.name, ...p.worldPresets]),
  ...statusEffects.map((s) => s.name),
  ...game.creatures.map((c) => c.name),
  ...attacks.map((a) => a.name),
  ...summons.flatMap((s) => (s.name ? [s.name] : [])),
  ...fighters.flatMap((f) => (f.weakSpots ?? []).map((spot) => spot.name)),
  ...game.blockers.map((b) => b.name),
  ...game.armorPieces.map((p) => p.name),
  game.freezing.name,
  game.wet.name,
  game.barrier.name,
  game.barrier.staff,
  game.barrier.skill,
  ...(game.forge ? [game.forge.name] : []),
  ...game.ruleEffects.map((e) => e.name),
]
const modifierSets = [
  game.player.modifiers,
  game.wet.modifiers,
  ...statusEffects.map((s) => s.modifiers),
  ...game.blockers.map((b) => b.modifiers),
  ...game.armorPieces.map((p) => p.modifiers),
  ...game.ruleEffects.map((e) => e.modifiers ?? {}),
  ...fighters.flatMap((f) => [
    f.modifiers,
    f.toolModifiers ?? {},
    ...(f.weakSpots ?? []).flatMap((spot) => [spot.modifiers, spot.toolModifiers ?? {}]),
  ]),
]
const blocker = (id: string) => {
  const found = game.blockers.find((b) => b.id === id)
  if (!found) throw new Error(`no blocker ${id}`)
  return found
}
const piece = (id: string) => {
  const found = game.armorPieces.find((p) => p.id === id)
  if (!found) throw new Error(`no armor piece ${id}`)
  return found
}
const effect = (id: string) => {
  const found = game.ruleEffects.find((e) => e.id === id)
  if (!found) throw new Error(`no rule effect ${id}`)
  return found
}
const duplicates = (ids: string[]) => ids.filter((id, index) => ids.indexOf(id) !== index)

describe('game data', () => {
  it('places every creature in biomes the data lists', () => {
    const biomes = game.creatures.flatMap((c) => [
      ...c.biomes,
      ...(c.conditional ?? []).flatMap((appearance) => appearance.biomes),
    ])
    expect(biomes.filter((b) => !biomeIds.has(b))).toEqual([])
  })

  it('deals only the damage types the engine knows', () => {
    const types = new Set<string>(DAMAGE_TYPES)
    expect(hits.flatMap((hit) => Object.keys(hit.damages)).filter((t) => !types.has(t))).toEqual([])
  })

  it('uses only damage modifiers the engine can apply', () => {
    const states = modifierSets.flatMap<DamageModifier>((set) => Object.values(set))
    expect(states.filter((state) => typeof damageMultiplier(state) !== 'number')).toEqual([])
  })

  it('names everything in French and in English', () => {
    expect(names.filter((name) => !name.fr || !name.en)).toEqual([])
  })

  it('lists no two creatures of a biome that read alike, in French or in English', () => {
    const shown = (c: (typeof game.creatures)[number], language: 'fr' | 'en') =>
      `${c.name[language]}|${c.origin ?? ''}`
    const clashes = game.biomes.flatMap((biome) =>
      (['fr', 'en'] as const).flatMap((language) => {
        const names = game.creatures
          .filter((c) => c.biomes.includes(biome.id))
          .map((c) => shown(c, language))
        return duplicates(names).map((name) => `${biome.id}, ${language}: ${name}`)
      }),
    )
    expect(clashes).toEqual([])
  })

  it('freezes the player only in biomes the data lists', () => {
    expect(game.freezing.biomes).not.toEqual([])
    expect(game.freezing.biomes.filter((b) => !biomeIds.has(b))).toEqual([])
  })

  it('takes the origin of a creature among the biomes', () => {
    const origins = game.creatures.flatMap((c) => (c.origin ? [c.origin] : []))
    expect(origins.filter((origin) => !biomeIds.has(origin))).toEqual([])
  })

  it('has unique creature, blocker, armor piece and effect ids', () => {
    expect(duplicates(game.creatures.map((c) => c.id))).toEqual([])
    expect(duplicates(game.blockers.map((b) => b.id))).toEqual([])
    expect(duplicates(game.armorPieces.map((p) => p.id))).toEqual([])
    expect(duplicates(game.ruleEffects.map((e) => e.id))).toEqual([])
  })

  it("brings a set's effect only with pieces enough to wear it whole", () => {
    const sets = game.ruleEffects.flatMap((e) => (e.set ? [e.set] : []))
    const short = sets.filter(
      (set) => game.armorPieces.filter((p) => p.set === set.id).length < set.size,
    )
    expect(sets).not.toEqual([])
    expect(short).toEqual([])
  })

  it('describes every status effect an attack carries', () => {
    const carried = attacks.flatMap((a) => [
      ...(a.statusEffect ? [a.statusEffect.id] : []),
      ...(a.leaves ?? []).map((pool) => pool.statusEffect),
    ])
    expect(carried.filter((id) => !(id in game.statusEffects))).toEqual([])
  })

  it('names the attacks of one fighter apart', () => {
    const clashes = fighters.flatMap((f) =>
      (['fr', 'en'] as const).flatMap((lang) => {
        const used = f.attacks.map((a) => a.name[lang])
        return duplicates(used)
      }),
    )
    expect(clashes).toEqual([])
  })

  it('gives every attack something to deal or to summon', () => {
    expect(attacks.filter((a) => a.hits.length === 0 && !a.summons?.length)).toEqual([])
  })

  it('lets a parry stagger only a creature that can be staggered', () => {
    expect(fighters.filter((f) => f.staggeredByParry && !f.staggerable)).toEqual([])
  })

  it('keeps star ranges in order', () => {
    expect(game.creatures.filter((c) => c.stars.min > c.stars.max)).toEqual([])
  })

  it('scales the world the way the engine does', () => {
    for (const preset of game.world.presets) {
      expect(worldScale({ difficulty: preset.id, players: 1 })).toEqual({
        enemy: preset.enemyDamage,
        you: preset.playerDamage,
      })
    }
    const { maxPlayers, damageScalePerPlayer, healthScalePerPlayer } = game.world
    const crowded = worldScale({ difficulty: 'normal', players: maxPlayers + 3 })
    expect(crowded.enemy).toBeCloseTo(1 + (maxPlayers - 1) * damageScalePerPlayer, 9)
    expect(crowded.you).toBeCloseTo(1 / (1 + (maxPlayers - 1) * healthScalePerPlayer), 9)
  })

  it("resolves a hit with the player's own rules", () => {
    const defence = defenceOf({
      player: game.player,
      blocker: { blockPower: 10, blockPowerPerLevel: 0, timedBlockBonus: 1.5 },
      level: 1,
      skill: 0,
      armor: 0,
      maxHealth: 100,
    })
    const overwhelming = { damages: { blunt: 1000 }, staggerMultiplier: 1, blockable: true }
    const world = { difficulty: 'normal', players: 1 } as const
    const blocked = resolveHit(defence, overwhelming, world, {
      guard: 'block',
      stars: 0,
      barBefore: 0,
    })
    const parried = resolveHit(defence, overwhelming, world, {
      guard: 'parry',
      stars: 0,
      barBefore: 0,
    })

    expect(blocked?.stamina).toBe(game.player.blockStaminaDrain)
    expect(parried?.stamina).toBe(game.player.perfectBlockStaminaDrain)
    expect(blocked?.bar.limit).toBeCloseTo(game.player.staggerFactor * 100, 9)
  })

  it('rebuilds the worked example from the extracted silver shield', () => {
    expect(
      defenceOf({
        player: game.player,
        blocker: blocker('ShieldSilver'),
        level: 3,
        skill: 25,
        armor: 45,
        maxHealth: 150,
      }),
    ).toMatchObject({ blockPower: 81, parryPower: 121.5 })
  })

  it('gives the engine the pieces and the effects as the data lists them', () => {
    const defence = defenceOf({
      player: game.player,
      blocker: blocker('ShieldIronBuckler'),
      level: 3,
      skill: 16,
      armor: 0,
      maxHealth: 140,
      pieces: [
        { ...piece('ArmorRootChest'), level: 4 },
        { ...piece('CapeAsh'), level: 1 },
      ],
      effects: [effect('TrinketIronHealth'), effect('GP_Bonemass')],
    })

    expect(defence).toMatchObject({
      armor: 14 + 12 + 20,
      modifiers: {
        blunt: 'slightlyResistant',
        slash: 'slightlyResistant',
        pierce: 'resistant',
        fire: 'weak',
        frost: 'resistant',
        spirit: 'immune',
      },
      blockStaminaGear: -0.2,
      blockStaminaEffects: -1,
      blockStaminaFlat: -5,
    })
  })
})

describe('Wet and the Magic barrier', () => {
  it('rain in the biomes the game data lists', () => {
    expect(game.wet.biomes.every((biome) => biomeIds.has(biome))).toBe(true)
    expect(game.wet.biomes).toContain('swamp')
    expect(game.wet.biomes).not.toContain('mountain')
  })

  it("counts the Lox's Stomp 320 for a barrier, its chop and pickaxe included", () => {
    const lox = game.creatures.find((creature) => creature.id === 'Lox')!
    const stomp = lox.attacks.find((attack) => attack.ids.includes('lox_stomp'))!.hits[0]!
    const capacity = game.barrier.absorb + game.barrier.absorbPerSkill * 20

    expect(
      barrierTakes(capacity, stomp, { difficulty: 'normal', players: 1 }, { stars: 0 }),
    ).toEqual({
      counted: 320,
      hits: 1,
    })
  })
})
