// What the « Humide et Barrière · pistes » boards show (#69), worked out by the app's own engine and models, in two
// scenes. Wet: Eikthyr in the Meadows' rain, against an early gear (Wood shield level 1, Blocking 0, rags, 45 HP,
// nothing carried), where lightning weak makes the blocked Charge and Stomp stagger. The Magic barrier: the Lox in
// the Plains, against the mockups' gear (Silver shield level 3, Blocking 25, iron pieces level 1 and the wolf cape
// level 3, 150 HP) and what Origine carries (the Iron Brooch, Bonemass, the frost mead; Fader's power from the group).
// The engine knows neither yet: Wet goes in as an effect of its game modifiers, and the barrier's count is worked out
// here from the game's rules (SE_Shield), the hit's chop and pickaxe read from the game data by hand, since the
// extraction drops them today.
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { staggerThreshold, toInflict } from '@/combat/creature'
import { resolveHit } from '@/combat/hit'
import { game } from '@/data'
import type { GameCreature, GameRuleEffect } from '@/data/types'
import { assess, creaturesOf } from '@/features/bestiary/model'
import { adviceShown } from '@/features/bestiary/wording'
import { creatureHits, idleOf, type Idle } from '@/features/effects/model'
import { effectOf } from '@/features/gear/carried'
import { fr } from '@/i18n/fr'

const world = { difficulty: 'normal', players: 1 } as const
const EARLY: Gear = {
  blocker: 'ShieldWood',
  level: 1,
  skill: 0,
  armor: 0,
  maxHealth: 45,
  pieces: { chest: { id: 'ArmorRagsChest', level: 1 }, legs: { id: 'ArmorRagsLegs', level: 1 } },
}
const MOCKUPS: Gear = {
  blocker: 'ShieldSilver',
  level: 3,
  skill: 25,
  armor: 0,
  maxHealth: 150,
  pieces: {
    helmet: { id: 'HelmetIron', level: 1 },
    chest: { id: 'ArmorIronChest', level: 1 },
    legs: { id: 'ArmorIronLegs', level: 1 },
    cape: { id: 'CapeWolf', level: 3 },
  },
  carried: { trinket: 'TrinketIronHealth', power: 'GP_Bonemass', drinks: ['Potion_frostresist'], group: ['GP_Fader'] },
}
const ROWS = ['TrinketIronHealth', 'GP_Bonemass', 'Potion_frostresist', 'GP_Fader']
// SE_Wet's m_mods, merged like any effect's.
const WET = {
  id: 'Wet',
  name: { fr: 'Humide', en: 'Wet' },
  kind: 'weather',
  ttl: 120,
  modifiers: { fire: 'resistant', frost: 'weak', lightning: 'weak' },
} as unknown as GameRuleEffect
const effect = (id: string) => (id === WET.id ? WET : effectOf(id))
const creature = (id: string) => game.creatures.find((candidate) => candidate.id === id)!
const EIKTHYR = creature('Eikthyr')
const LOX = creature('Lox')

// SE_Shield (Staff_shield): 200 + 5 per Blood Magic level of the caster; it counts every type of a hit, chop and
// pickaxe too, after the world's scaling, and takes the hit that overflows it whole.
const capacity = (bloodMagic: number) => 200 + 5 * bloodMagic
const TOOLS: Record<string, number> = { lox_stomp: 200, lox_bite: 0 }
const barrier = (who: GameCreature, gear: Gear, bloodMagic: number) => ({
  bloodMagic,
  capacity: capacity(bloodMagic),
  attacks: who.attacks.map((attack) => {
    const hit = attack.hits[0]!
    const received = resolveHit(gearDefence(gear), hit, world, { guard: 'block', stars: 0, barBefore: 0 })!.received
    const counted = received + (TOOLS[attack.ids[0]!] ?? 0)
    return { name: attack.name.fr, counted, hits: Math.floor(capacity(bloodMagic) / counted) + 1 }
  }),
})

const list = (items: readonly string[]) => new Intl.ListFormat('fr', { type: 'conjunction' }).format(items)
const typeName = (type: string) => game.damageTypes[type as 'fire'].fr.toLocaleLowerCase('fr')
function idleText(idle: Idle | null): string | null {
  if (idle === null) return null
  switch (idle.kind) {
    case 'noHit':
      return 'Ne change aucun coup'
    case 'notDealt': {
      const [last, ...first] = [...idle.types].reverse().map((type) => `de ${typeName(type)}`)
      return `Ne change rien : pas ${first.length ? `${first.reverse().join(', ')} ni ${last}` : last}`
    }
    case 'resisted': {
      const by = idle.by
      const holder = by.kind === 'piece' ? 'ta cape' : by.kind === 'group' ? `le ${effectOf(by.id).name.fr}` : `ton ${by.kind}`
      return `Ne change rien : déjà couvert par ${holder}`
    }
    default:
      return 'Ne change rien ici'
  }
}
const verdictsOf = (who: GameCreature, gear: Gear, on: readonly GameRuleEffect[]) => {
  const assessment = assess(who, gearDefence(gear, on), world, 0)
  const shown = adviceShown(assessment, fr, 'fr')
  return { assessment, advice: { tone: shown.tone, text: shown.text } }
}
// The sheet with these effects on: its stats, advice, each attack's verdicts and what one blocked or parried takes,
// and why each row of the card changes nothing, if so.
function sheet(who: GameCreature, gear: Gear, onIds: readonly string[], rows: readonly string[]) {
  const on = onIds.map(effect)
  const defence = gearDefence(gear, on)
  const { assessment, advice } = verdictsOf(who, gear, on)
  const threshold = staggerThreshold(who, 0)
  return {
    on: onIds,
    name: who.name.fr,
    health: who.health,
    toInflict: threshold === null ? null : Math.round(toInflict(threshold, world)),
    parryStaggers: who.staggeredByParry,
    modifiers: who.modifiers,
    advice,
    attacks: assessment.attacks.map(({ attack, damage, verdicts }) => {
      const at = (guard: 'block' | 'parry') => resolveHit(defence, attack.hits[0]!, world, { guard, stars: 0, barBefore: 0 })!
      return {
        name: attack.name.fr,
        kind: attack.kind,
        types: Object.keys(attack.hits[0]!.damages),
        damage,
        block: verdicts?.block,
        parry: verdicts?.parry,
        dodgeable: verdicts?.dodgeable,
        sim: { block: at('block'), parry: at('parry') },
      }
    }),
    idle: Object.fromEntries(
      [...rows, WET.id].map((id) => [id, idleText(idleOf(effect(id), { gear, on, hits: creatureHits(who), world, stars: 0 }))]),
    ),
  }
}
// A biome's list as the Bestiary shows it.
const biomeList = (biome: 'meadows' | 'plains', gear: Gear, onIds: readonly string[]) =>
  creaturesOf(biome).map((who) => {
    const { assessment, advice } = verdictsOf(who, gear, onIds.map(effect))
    return { name: who.name.fr, health: who.health, block: assessment.block, parry: assessment.parry, dodgeable: assessment.dodgeable, advice }
  })
const meadows = (onIds: readonly string[]) => biomeList('meadows', EARLY, onIds)

const out = {
  early: { blockPower: gearDefence(EARLY).blockPower, armor: gearDefence(EARLY).armor },
  mockups: { blockPower: gearDefence(MOCKUPS).blockPower, armor: gearDefence(MOCKUPS).armor },
  eikthyr: { none: sheet(EIKTHYR, EARLY, [], []), wet: sheet(EIKTHYR, EARLY, [WET.id], []) },
  meadows: { none: meadows([]), wet: meadows([WET.id]) },
  plains: biomeList('plains', MOCKUPS, []),
  lox: {
    none: sheet(LOX, MOCKUPS, [], ROWS),
    barrier: Object.fromEntries([0, 20, 50].map((bm) => [bm, barrier(LOX, MOCKUPS, bm)])),
  },
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/data.json', import.meta.url), JSON.stringify(out, null, 1))
console.log('early', out.early, 'mockups', out.mockups)
const line = (s: ReturnType<typeof sheet>) =>
  `${s.name} | ${s.advice.text} | ${s.attacks.map((a) => `${a.name} ${a.damage} ${a.block}/${a.parry} taken ${a.sim.block.taken.toFixed(1)}/${a.sim.parry.taken.toFixed(1)} bar ${(a.sim.block.bar.shield + a.sim.block.bar.armor).toFixed(1)}/${a.sim.block.bar.limit}`).join(' · ')} | ${JSON.stringify(s.idle)}`
console.log('dry', line(out.eikthyr.none))
console.log('wet', line(out.eikthyr.wet))
console.log('lox', line(out.lox.none))
for (const key of ['none', 'wet'] as const) console.log('meadows', key, out.meadows[key].map((c) => `${c.name} ${c.block}/${c.parry} ${c.advice.text}`).join(' · '))
console.log('barrier', JSON.stringify(out.lox.barrier))
