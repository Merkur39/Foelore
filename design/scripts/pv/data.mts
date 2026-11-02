// What the « PV et ton monde · pistes » boards show (#84), worked out by the app's own engine and models: the Troll and
// the Black Forest against the mockups' gear (Silver shield level 3, Blocking 25, iron pieces level 1 and the wolf cape
// level 3, 150 HP, what Origine carries, nothing lit), in three worlds: Hard with 3 players, Very easy alone, and Normal
// alone as today. The health to deal is the game's max health over what the world leaves of your hits, as « À
// infliger » already is (Character.ApplyDamage: GetDifficultyDamageScaleEnemy, then Game.m_playerDamageRate).
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs, then node add.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { enemyScale, gearDefence } from '@/app/context'
import type { Gear } from '@/app/store'
import { creatureHealth, staggerThreshold, toInflict } from '@/combat/creature'
import { worldScale, type World } from '@/combat/world'
import { game } from '@/data'
import type { GameCreature } from '@/data/types'
import { assess, creaturesOf, qualifierOf } from '@/features/bestiary/model'
import { adviceShown } from '@/features/bestiary/wording'
import { fr } from '@/i18n/fr'

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
const WORLDS: Record<string, World> = {
  hard3: { difficulty: 'hard', players: 3 },
  veryEasy1: { difficulty: 'veryEasy', players: 1 },
  normal1: { difficulty: 'normal', players: 1 },
}
const defence = gearDefence(MOCKUPS)
const TROLL = game.creatures.find((candidate) => candidate.id === 'Troll')!

// The health to deal, in the unit of your hits as the game shows them: what « À infliger » does to the stagger bar.
const toDeal = (who: GameCreature, world: World) => Math.round(creatureHealth(who.health, 0) / worldScale(world).you)

function sheet(who: GameCreature, world: World) {
  const assessment = assess(who, defence, world, 0)
  const shown = adviceShown(assessment, fr, 'fr')
  const threshold = staggerThreshold(who, 0)
  return {
    name: who.name.fr,
    health: creatureHealth(who.health, 0),
    toDeal: toDeal(who, world),
    toInflict: threshold === null ? null : Math.round(toInflict(threshold, world)),
    parryStaggers: who.staggeredByParry,
    modifiers: who.modifiers,
    advice: { tone: shown.tone, text: shown.text },
    attacks: assessment.attacks.map(({ attack, damage, verdicts }) => ({
      name: attack.name.fr,
      kind: attack.kind,
      types: Object.keys(attack.hits[0]!.damages),
      damage,
      block: verdicts?.block,
      parry: verdicts?.parry,
      dodgeable: verdicts?.dodgeable,
    })),
  }
}
const list = (world: World) =>
  creaturesOf('blackForest').map((who) => {
    const assessment = assess(who, defence, world, 0)
    const shown = adviceShown(assessment, fr, 'fr')
    return {
      name: who.name.fr,
      qualifier: qualifierOf(who, 'fr'),
      health: creatureHealth(who.health, 0),
      toDeal: toDeal(who, world),
      block: assessment.block,
      parry: assessment.parry,
      dodgeable: assessment.dodgeable,
      advice: { tone: shown.tone, text: shown.text },
    }
  })

const out = {
  blockPower: defence.blockPower,
  armor: defence.armor,
  worlds: Object.fromEntries(
    Object.entries(WORLDS).map(([key, world]) => [
      key,
      { you: worldScale(world).you, enemy: enemyScale(world), troll: sheet(TROLL, world), blackForest: list(world) },
    ]),
  ),
}
mkdirSync(new URL('./out/', import.meta.url), { recursive: true })
writeFileSync(new URL('./out/data.json', import.meta.url), JSON.stringify(out, null, 2))
for (const [key, w] of Object.entries(out.worlds)) {
  console.log(key, 'you', w.you.toFixed(4), 'enemy', w.enemy, 'troll', w.troll.health, '→', w.troll.toDeal, 'stagger', w.troll.toInflict, w.troll.advice.text)
}
