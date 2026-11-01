// What the « Dégâts · pistes » boards show, worked out by the app's own engine, with the game's roll applied by
// hand (Attack.ModifyDamage: every hit an attack builds, times √U(0.75, 1)), and burning and poison as their
// status effects deal them (SE_Burning, SE_Poison). The ticket's gear: Iron Buckler level 3, Blocking 16,
// armor 48, 140 HP.
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { attackAdvice } from '@/combat/advice'
import { attackDamage } from '@/combat/attack'
import { applyArmorTo } from '@/combat/armor'
import { scaleDamages, type Damages } from '@/combat/damage'
import { resolveHit, type Guard, type Hit } from '@/combat/hit'
import { applyModifiers } from '@/combat/modifiers'
import { findAttack } from '@/features/simulation/model'

const world = { difficulty: 'normal', players: 1 } as const
const gear: Gear = { blocker: 'ShieldIronBuckler', level: 3, skill: 16, armor: 48, maxHealth: 140 }
const defence = gearDefence(gear)
const LOW = Math.sqrt(0.75)
const rolled = (hit: Hit, r: number): Hit =>
  (hit.scaling ?? 'attack') === 'attack'
    ? { ...hit, damages: scaleDamages(hit.damages, r), trueDamage: (hit.trueDamage ?? 0) * r }
    : hit

function at(hit: Hit, guard: Guard, r: number) {
  const h = rolled(hit, r)
  const res = resolveHit(defence, h, world, { guard, stars: 0, barBefore: 0 })!
  // The fire and poison past the guard and the armor, as Character.RPC_Damage hands them to their effects.
  const power = guard === 'parry' ? defence.parryPower! : defence.blockPower
  let damages: Damages = h.damages
  if (h.blockable) {
    damages = applyModifiers(damages, defence.blockerModifiers ?? {})
    if (res.verdict !== 'broken') damages = applyArmorTo(damages, power)
  }
  const past = applyArmorTo(applyModifiers(damages, defence.modifiers ?? {}), defence.armor)
  const fire = past.fire ?? 0
  const poison = past.poison ?? 0
  // SE_Burning.AddFireDamage: 5 ticks, a second apart; one under 0.2 with nothing burning yet: no burn at all.
  const burn = fire / 5 < 0.2 ? 0 : fire
  // SE_Poison.AddDamage: 1 + √(5 × dose) seconds, a tick a second.
  const poisonSeconds = poison > 0 ? Math.floor(1 + Math.sqrt(poison * 5)) : 0
  const { before, shield, armor, limit } = res.bar
  return {
    verdict: res.verdict,
    direct: res.taken - res.overTime,
    today: res.taken,
    burn,
    poison,
    poisonSeconds,
    parts: [before, shield, armor],
    bar: Math.min(limit, before + shield + armor),
    limit,
    staggered: res.staggered,
    stamina: res.stamina,
  }
}

const N = 4000
function guardFigures(hit: Hit, guard: Guard) {
  const low = at(hit, guard, LOW)
  const top = at(hit, guard, 1)
  // U evenly over [0.75, 1]: the share of the rolls that end in the top's verdict.
  let same = 0
  for (let i = 0; i <= N; i++) if (at(hit, guard, Math.sqrt(0.75 + (0.25 * i) / N)).verdict === top.verdict) same++
  return { low, top, share: same / (N + 1) }
}

// The four attacks of the tracks, then, for track C's iteration, one with its own damage (not rolled).
const SCENES = [
  ['Dragon', 'dragon_bite'],
  ['Dragon', 'dragon_claw_left'],
  ['Fenring_Cultist', 'Fenring_attack_fireclaw'],
  ['Bonemass', 'bonemass_attack_punch'],
  ['Fader', 'Fader_Flamebreath'],
] as const
const sceneOf = (hit: Hit) => {
  const block = guardFigures(hit, 'block')
  const parry = guardFigures(hit, 'parry')
  return {
    types: Object.keys(hit.damages),
    rolled: (hit.scaling ?? 'attack') === 'attack',
    advice: attackAdvice({ block: block.top.verdict, parry: parry.top.verdict }),
    block,
    parry,
  }
}
const scenes = SCENES.map(([fighter, attack]) => {
  const found = findAttack({ fighter, attack })!
  return {
    id: `${fighter}/${attack}`,
    creature: found.creature.name,
    attack: found.attack.name,
    kind: found.attack.kind,
    listed: attackDamage(found.attack.hits, 0),
    dodgeable: found.attack.hits.every((hit) => hit.dodgeable),
    ...sceneOf(found.attack.hits[0]!),
  }
})
// The Simulation's free value: a plain physical blow, which the game rolls like an attack's.
const FREE = 90
const free = { id: 'free', listed: FREE, dodgeable: null, ...sceneOf({ damages: { blunt: FREE }, staggerMultiplier: 1, blockable: true }) }
scenes.push(free as (typeof scenes)[number])
const out = { blockPower: defence.blockPower, armor: defence.armor, scenes }
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/data.json', import.meta.url), JSON.stringify(out, null, 1))
const f = (x: number) => Math.round(x * 10) / 10
for (const s of scenes)
  for (const g of ['block', 'parry'] as const) {
    const { low, top, share } = s[g]
    console.log(s.creature?.fr ?? 'Valeur libre', s.attack?.fr ?? s.listed, g, top.verdict, f(share), low.verdict, '| direct', f(low.direct), f(top.direct), '| today', f(top.today), '| burn', f(low.burn), f(top.burn), '| poison', f(low.poison), f(top.poison), low.poisonSeconds, top.poisonSeconds, '| bar', f(low.bar), f(top.bar), '/', f(top.limit), '| stam', f(top.stamina))
  }
console.log('VD', f(defence.blockPower), 'armor', defence.armor)
