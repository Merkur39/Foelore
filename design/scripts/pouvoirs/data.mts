// What the « Pouvoirs · pistes » boards show (#79), worked out by the app's own engine and models: the mockups' gear
// (Silver shield level 3, Blocking 25, iron pieces level 1 and the wolf cape level 3, 150 HP) against the Lox, with
// Bonemass's power (the player's own), Fader's (a groupmate's) and Moder's (another one's) switched on or off.
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier } from '@/combat/modifiers'
import { game } from '@/data'
import type { GameRuleEffect } from '@/data/types'
import { assess } from '@/features/bestiary/model'
import { creatureHits, idleOf, type Idle } from '@/features/effects/model'
import { carriable, changesNoHit, effectOf } from '@/features/gear/carried'

const world = { difficulty: 'normal', players: 1 } as const
const gear: Gear = {
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
}
const BROCHE = 'TrinketIronHealth'
const GEL = 'Potion_frostresist'
const FIRE_MEAD = 'Potion_barleywine'
const LOX = game.creatures.find((creature) => creature.id === 'Lox')!
// Where a group's power makes a drink one carries useless: the Fuling shaman's fireball against Fader's power.
const SHAMAN = game.creatures.find((creature) => creature.id === 'GoblinShaman')!

const n = (x: number) => x.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const list = (items: readonly string[]) => new Intl.ListFormat('fr', { type: 'conjunction' }).format(items)
// As the app words them (features/effects/wording.ts): how long, then each change apart.
function lines(effect: GameRuleEffect): string[] {
  if (changesNoHit(effect)) return ['5 min · ne change aucun coup']
  const byMultiplier = new Map<number, string[]>()
  for (const type of DAMAGE_TYPES) {
    const modifier = effect.modifiers?.[type]
    if (modifier === undefined || modifier === 'normal' || modifier === 'ignore') continue
    const multiplier = damageMultiplier(modifier)
    byMultiplier.set(multiplier, [...(byMultiplier.get(multiplier) ?? []), game.damageTypes[type].fr])
  }
  const changes = [
    ...[...byMultiplier].map(([multiplier, types]) => `${list(types)} ×${n(multiplier)}`),
    ...(effect.staggerModifier ? [`tu titubes ${n(1 / (1 + effect.staggerModifier))}× moins vite`] : []),
    ...(effect.blockStaminaModifier === -1 && (effect.blockStaminaFlat ?? 0) < 0
      ? [`bloquer rend ${n(-effect.blockStaminaFlat!)} d'endurance`]
      : []),
  ]
  const [first, ...rest] = changes
  return [`${effect.ttl! / 60} min · ${first}`, ...rest]
}
const RESISTED: Record<string, string> = { cape: 'ta cape résiste déjà', power: 'ton pouvoir résiste déjà' }
function idleText(idle: Idle | null): string | null {
  if (idle === null) return null
  switch (idle.kind) {
    case 'noHit':
      return 'Ne change aucun coup'
    case 'notDealt':
      return `Ne change rien : pas ${idle.types.map((type) => `de ${game.damageTypes[type].fr.toLocaleLowerCase('fr')}`).join(' ni ')}`
    case 'resisted':
      return `Ne change rien : ${RESISTED[idle.by.kind === 'piece' ? idle.by.slot : idle.by.kind]}`
    default:
      return 'Ne change rien ici'
  }
}

const powers = carriable('power').map((effect) => ({ id: effect.id, name: effect.name.fr, lines: lines(effect) }))
const ADVICE = (advice: ReturnType<typeof assess>['advice']) => {
  switch (advice.kind) {
    case 'blockAll':
      return { tone: 'ok', text: 'Tu bloques tout sans tituber' }
    case 'parryAll':
      return { tone: 'warn', text: `Pare-le : ${advice.block === 'broken' ? 'le blocage cède' : 'en bloquant, tu titubes'}` }
    default:
      return { tone: 'bad', text: advice.kind }
  }
}
// The sheet with these powers on: its advice, each attack's verdicts, and why each power changes nothing, if so.
function sheet(onIds: readonly string[], creature = LOX) {
  const on = onIds.map(effectOf)
  const hits = creatureHits(creature)
  const assessment = assess(creature, gearDefence(gear, on), world, 0)
  return {
    on: onIds,
    advice: ADVICE(assessment.advice),
    attacks: assessment.attacks.map(({ attack, damage, verdicts }) => ({
      name: attack.name.fr,
      kind: attack.kind,
      types: Object.keys(attack.hits[0]!.damages),
      damage,
      block: verdicts?.block,
      parry: verdicts?.parry,
    })),
    idle: Object.fromEntries(
      [...carriable('power'), effectOf(BROCHE), effectOf(GEL), effectOf(FIRE_MEAD)].map((effect) => [
        effect.id,
        idleText(idleOf(effect, { gear, on, hits, world, stars: 0 })),
      ]),
    ),
  }
}
const defence = gearDefence(gear)
const out = {
  blockPower: defence.blockPower,
  armor: defence.armor,
  lox: { name: LOX.name.fr, health: LOX.health, modifiers: LOX.modifiers },
  powers,
  sheets: {
    none: sheet([]),
    own: sheet(['GP_Bonemass']),
    two: sheet(['GP_Bonemass', 'GP_Fader']),
    three: sheet(['GP_Bonemass', 'GP_Fader', 'GP_Moder']),
  },
  // The Fuling shaman, the fire mead carried: nothing on, then Fader's power from the group.
  shaman: { name: SHAMAN.name.fr, health: SHAMAN.health, none: sheet([], SHAMAN), fader: sheet(['GP_Fader'], SHAMAN) },
  // Iteration 1 of track B: every state of the switches that change something (the Brooch, Bonemass, Fader's),
  // keyed by what is on, in that order.
  states: Object.fromEntries(
    [0, 1, 2, 3, 4, 5, 6, 7].map((bits) => {
      const on = [BROCHE, 'GP_Bonemass', 'GP_Fader'].filter((_, i) => bits & (1 << i))
      return [on.join('+'), sheet(on)]
    }),
  ),
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/data.json', import.meta.url), JSON.stringify(out, null, 1))
console.log('VD', out.blockPower, 'armor', out.armor)
for (const [key, s] of Object.entries(out.sheets))
  console.log(key, s.advice.text, '|', s.attacks.map((a) => `${a.name} ${a.damage} ${a.block}/${a.parry}`).join(' · '), '|', JSON.stringify(s.idle))
for (const [key, s] of Object.entries(out.states))
  console.log(key || '(none)', '|', s.advice.text, '|', s.attacks.map((a) => `${a.block}/${a.parry}`).join(' '), '|', s.idle[BROCHE], s.idle[GEL])
for (const key of ['none', 'fader'] as const) {
  const s = out.shaman[key]
  console.log('shaman', key, '|', s.advice.text, '|', s.attacks.map((a) => `${a.name} ${a.damage} ${a.block}/${a.parry}`).join(' · '), '|', JSON.stringify(s.idle))
}
for (const p of powers) console.log(p.name, p.lines.join(' / '))
