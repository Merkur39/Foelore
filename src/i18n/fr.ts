import { APP_NAME, PUBLISHER } from '@/app/brand'
import type { Theme } from '@/app/store'
import type { Guard, Verdict } from '@/combat/hit'
import type { BiomeId } from '@/data/types'
import type { Language } from './detect'
import { formatNumber } from './format'

const n = (value: number) => formatNumber(value, 'fr')
const plurals = new Intl.PluralRules('fr')
const plural = (count: number, one: string, other: string) =>
  `${n(count)} ${plurals.select(count) === 'one' ? one : other}`
const players = (count: number) => plural(count, 'joueur', 'joueurs')
// A power by its name in the game, with the article a common noun takes: « le Pouvoir de Fader », « Moder ».
const theName = (power: string) => (power.startsWith('Pouvoir ') ? `le ${power}` : power)
const rowState = { equipped: ', équipé', carried: ', emporté', group: ', du groupe' }
const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const listOf = (words: readonly string[]) =>
  new Intl.ListFormat('fr', { type: 'conjunction' }).format(
    words.map((word) => word.toLocaleLowerCase('fr')),
  )
const staminaShare = (share: number) =>
  `${n(Math.abs(share))} % d'endurance ${share < 0 ? 'en moins' : 'en plus'}`
// « de feu », « d'esprit », « de contondant, coupant ni perforant »: the game's names, lowercased.
function noneOf(types: readonly string[]) {
  const words = types.map((type) => type.toLocaleLowerCase('fr'))
  const listed =
    words.length > 1
      ? `${words.slice(0, -1).join(', ')} ni ${words.at(-1) ?? ''}`
      : (words[0] ?? '')
  return /^[aeiouyéèêh]/i.test(listed) ? `d'${listed}` : `de ${listed}`
}
const range = (low: number, top: number) => (low === top ? n(top) : `${n(low)} à ${n(top)}`)
// What a guard comes to, as « Détails » says how often.
const outcome = (guard: Guard, verdict: Verdict) =>
  verdict === 'broken'
    ? guard === 'block'
      ? 'le blocage cède'
      : 'la parade cède'
    : verdict === 'staggered'
      ? 'tu titubes'
      : 'tu tiens'

/** What « Détails » says a status effect deals, rounded. */
export interface OverTimeRange {
  readonly damage: number
  readonly seconds: number
}
export type OverTimeKind = 'burning' | 'poison' | 'spirit'

// French guillemets hold their words apart with a no-break space.
const NO_BREAK_SPACE = String.fromCharCode(0xa0)
const quoted = (name: string) => `«${NO_BREAK_SPACE}${name}${NO_BREAK_SPACE}»`

const themes: Record<Theme, { readonly name: string; readonly description: string }> = {
  origine: { name: 'Origine', description: 'Noir froid, accent bleu glacier' },
  braise: { name: 'Braise', description: 'Charbon chaud, accent os' },
  brume: { name: 'Brume', description: 'Nuit violette, accent lilas' },
  jour: { name: 'Plein jour', description: 'Clair, lisible en plein soleil' },
  runes: { name: 'Runes', description: 'Pierre sombre, rune turquoise' },
  graphite: { name: 'Graphite', description: 'Gris neutres, sobre' },
  parchemin: { name: 'Parchemin', description: 'Clair chaud, encre bleue' },
}

// « des Prairies », « de la Forêt noire »: de and the article of each biome's name.
const ofArticles = { 'les ': 'des ', 'la ': 'de la ', 'le ': 'du ', "l'": "de l'" } as const

// The article of each biome's name, for « Voir la Forêt noire »: the names are the game's, the articles
// are not.
const biomeArticles: Record<BiomeId, keyof typeof ofArticles> = {
  meadows: 'les ',
  blackForest: 'la ',
  swamp: 'les ',
  mountain: 'la ',
  plains: 'les ',
  mistlands: 'les ',
  ashlands: 'les ',
  deepNorth: 'le ',
  ocean: "l'",
}
const ofBiome = (biome: BiomeId, name: string) => `${ofArticles[biomeArticles[biome]]}${name}`

/** An attack in one sentence, for screen readers. */
interface AttackWords {
  readonly name: string
  /** The game's names of its damage types, the largest first. */
  readonly types: readonly string[]
  /** Null for an attack that only summons. */
  readonly damage: number | null
  readonly block: string
  readonly parry: string
  readonly dodgeable: boolean
}

/** The French interface. Its shape is the catalogue's: every language has the same keys, which the
 * typing checks. Short labels are written in sentence case; the styles capitalise them. */
export const fr = {
  screens: { bestiary: 'Bestiaire', simulation: 'Simulation', arsenal: 'Arsenal', guide: 'Mémo' },
  shell: {
    navigation: 'Navigation',
    mainNavigation: 'Navigation principale',
    settings: 'Réglages',
    context: 'Ton contexte',
    /** `wet` while Wet is on in the Bestiary's biome. */
    contextSummary: (blockPower: number, enemyScale: number, wet: boolean) =>
      `Ton contexte : VD ${n(blockPower)} ×${n(enemyScale)}${wet ? ', humide' : ''}`,
    contextPower: (blockPower: number) => `VD ${n(blockPower)}`,
    contextScale: (enemyScale: number) => `×${n(enemyScale)}`,
    contextNote: 'Chaque verdict en dépend',
  },
  gear: {
    /** `level` null for bare hands, which have none. */
    summary: (item: string, level: number | null, blockPower: number, skill: number) =>
      `Ton équipement : ${item}${level === null ? ',' : ` niveau ${n(level)},`} VD ${n(blockPower)}, compétence Blocage ${n(skill)}`,
    levelAndPower: (level: number | null, blockPower: number) =>
      level === null ? `VD ${n(blockPower)}` : `N${n(level)} · VD ${n(blockPower)}`,
    /** The pieces worn, each with its level; null for an armor typed in an earlier version. */
    bodySummary: (armor: number, health: number, pieces: readonly string[] | null) =>
      pieces === null
        ? `Armure ${n(armor)}, tapée · ${n(health)} PV max`
        : `Armure ${n(armor)} · ${n(health)} PV max${pieces.length > 0 ? ` : ${pieces.join(', ')}` : ''}`,
    title: 'Ton équipement',
    withstand: 'Ce que tu encaisses',
    emptyBar: 'Barre vide',
    block: 'Bloquer',
    parry: 'Parer',
    power: (power: number) => `VD ${n(power)}`,
    unstaggered: 'sans tituber',
    unbroken: 'tient',
    cannotParry: 'ton objet ne pare pas',
    staggersAt: (limit: number, share: number, health: number, armor: number) =>
      `Titube à ${n(limit)} (${n(share)} % de ${n(health)} PV) · armure ${n(armor)}`,
    powerParts: (base: number, skill: number) => `VD = ${n(base)} × ${n(skill)}`,
    held: 'En main',
    /** At the head of what is held. */
    handsFree: 'lâche ce que tu tiens',
    groupTags: { round: 'Rond', buckler: 'Targe', tower: 'Écu', weapon: 'Arme', other: 'Autre' },
    parryBonus: (bonus: number) => `×${n(bonus)}`,
    noParry: 'ne pare pas',
    lowerLevel: 'Niveau inférieur',
    raiseLevel: 'Niveau supérieur',
    /** The level of a row, by what the row holds; null when it holds nothing. */
    levelOf: (row: string, level: number | null) =>
      level === null ? `${row} : aucun` : `${row} : niveau ${n(level)}`,
    lowerLevelOf: (row: string) => `${row} : niveau inférieur`,
    raiseLevelOf: (row: string) => `${row} : niveau supérieur`,
    levelValue: (level: number) => `N${n(level)}`,
    skill: 'Compétence Blocage',
    lowerSkill: 'Moins de compétence',
    raiseSkill: 'Plus de compétence',
    pieces: "Pièces d'armures",
    slots: { helmet: 'Casque', chest: 'Plastron', legs: 'Jambières', cape: 'Cape' },
    noPiece: 'Aucun',
    armor: 'Armure',
    armorParts: (parts: readonly number[]) => parts.map(n).join(' + '),
    typedArmor: 'Armure tapée avant cette version : choisis tes pièces pour la remplacer.',
    resistances: 'Tes résistances',
    fullSet: 'Ensemble complet',
    /** What a set changes, by damage types sharing a multiplier: « Contondant, Coupant et Perforant ×1,25 ». */
    setModifier: (types: readonly string[], multiplier: number) =>
      `${new Intl.ListFormat('fr', { type: 'conjunction' }).format(types)} ×${n(multiplier)}`,
    /** `share` in percent. */
    dodgeCost: (share: number) => `Esquiver coûte ${n(share)} % d'endurance en moins`,
    health: 'PV max',
    lowerHealth: 'Moins de PV',
    raiseHealth: 'Plus de PV',
    carry: 'Ce que tu emportes',
    /** A row of Your gear, by what it holds. */
    rowValue: (row: string, value: string) => `${row} : ${value}`,
    noTrinket: 'Aucun',
    noPower: 'Aucun',
    noDrink: 'Aucune',
    addDrink: 'Ajouter une boisson',
    carriedNote:
      "Pas comptés d'office : allume-les sur la fiche d'une créature ou dans la Simulation, quand ils sont actifs.",
    /** What players of the group cast on you: their powers, apart from yours, which is one, and a barrier. */
    group: 'Du groupe',
    groupNote:
      "Ce qu'un joueur lance près de toi ; à allumer comme les tiens. La Barrière magique dépend de la Magie du sang de qui la lance.",
    addGroupPower: 'Ajouter un pouvoir du groupe',
    addBarrier: 'Ajouter une barrière magique',
    /** The barrier's row, by the caster's skill as the game names it: « Lancée avec Magie du sang 20 ». */
    barrierCast: (skill: string, level: number) => `Lancée avec ${skill} ${n(level)}`,
    /** How long it lasts, by the staff's level, and what it absorbs: « 1 à 4 min · absorbe 300 ». */
    barrierLines: (from: number, to: number, capacity: number) =>
      `${n(from)} à ${n(to)} min · absorbe ${n(capacity)}`,
  },
  /** The lists the rows of Your gear open, from the Arsenal. */
  lists: {
    back: 'Retour à Ton équipement, sans rien changer',
    titles: {
      hand: 'Ce que tu tiens',
      helmet: 'Ton casque',
      chest: 'Ton plastron',
      legs: 'Tes jambières',
      cape: 'Ta cape',
      trinket: 'Ton bibelot',
      power: 'Ton pouvoir',
      drink: 'Ta boisson',
      moreDrink: 'Une boisson de plus',
      group: 'Pouvoir du groupe',
      moreGroup: 'Un pouvoir du groupe',
    },
    search: {
      hand: 'Chercher ce que tu tiens',
      helmet: 'Chercher un casque',
      chest: 'Chercher un plastron',
      legs: 'Chercher des jambières',
      cape: 'Chercher une cape',
      trinket: 'Chercher un bibelot',
      power: 'Chercher un pouvoir',
      drink: 'Chercher une boisson',
      moreDrink: 'Chercher une boisson',
      group: 'Chercher un pouvoir',
      moreGroup: 'Chercher un pouvoir',
    },
    none: {
      helmet: 'Aucun casque',
      chest: 'Aucun plastron',
      legs: 'Aucunes jambières',
      cape: 'Aucune cape',
      trinket: 'Aucun bibelot',
      power: 'Aucun pouvoir',
      drink: 'Retirer cette boisson',
      group: 'Retirer ce pouvoir',
    },
    noneNote: {
      helmet: 'retire celui que tu portes',
      chest: 'retire celui que tu portes',
      legs: 'retire celles que tu portes',
      cape: 'retire celle que tu portes',
      trinket: 'retire celui que tu emportes',
      power: 'retire le tien',
    },
    /** « 11 capes », by the category's name. */
    count: (count: number, category: string) => `${n(count)} ${category.toLocaleLowerCase('fr')}`,
    countOf: (shown: number, all: number) => `${n(shown)} sur ${n(all)}`,
    /** `level` null for bare hands, which have none to pass on. */
    handNote: (skill: number, level: number | null) =>
      level === null
        ? `Au niveau 1, avec ta compétence Blocage ${n(skill)} ; son niveau se règle ensuite.`
        : `Au niveau 1, avec ta compétence Blocage ${n(skill)} ; ce que tu choisis garde ton N${n(level)}, s'il y monte.`,
    /** What a piece picked keeps; `level` null for a slot that holds nothing. */
    pieceNote: (slot: 'helmet' | 'chest' | 'legs' | 'cape', level: number | null) =>
      level === null
        ? 'Au niveau 1 ; son niveau se règle ensuite.'
        : `Au niveau 1 ; ${
            {
              helmet: 'celui que tu choisis garde le niveau de ton casque',
              chest: 'celui que tu choisis garde le niveau de ton plastron',
              legs: 'celles que tu choisis gardent le niveau de tes jambières',
              cape: 'celle que tu choisis garde le niveau de ta cape',
            }[slot]
          } (N${n(level)}), à régler ensuite.`,
    oneAtATime: (carrying: boolean): string =>
      carrying
        ? 'Un seul à la fois : celui que tu choisis remplace le tien.'
        : 'Un seul à la fois.',
    /** The drinks carried already, by their names in the game. */
    drinkOnce: (carried: readonly string[]) =>
      carried.length === 0
        ? "Une boisson ne se prend qu'une fois."
        : carried.length === 1
          ? `Ton ${carried[0] ?? ''} est déjà emporté : une boisson ne se prend qu'une fois.`
          : `Tes ${new Intl.ListFormat('fr', { type: 'conjunction' }).format(carried)} sont déjà emportés : une boisson ne se prend qu'une fois.`,
    drinkSwap: (drink: string) => `Choisis-en une autre pour remplacer ton ${drink}, ou retire-le.`,
    /** Your power and the group's, by their names in the game: a power counts once. */
    groupOnce: (own: string | null, group: readonly string[]) => {
      const there = [...(own === null ? [] : [`${own} (le tien)`]), ...group]
      return there.length === 0
        ? "Un pouvoir ne compte qu'une fois."
        : `Déjà là : ${new Intl.ListFormat('fr', { type: 'conjunction' }).format(there)}. Un pouvoir ne compte qu'une fois.`
    },
    groupSwap: (power: string) =>
      `Choisis-en un autre pour remplacer ${theName(power)}, ou retire-le.`,
  },
  /** What one carries, switched on while it lasts: a trinket, a guardian power, drinks. */
  effects: {
    kinds: { trinket: 'Bibelot', power: 'Pouvoir', consumable: 'Boisson' },
    /** The kind of a power the group casts on you. */
    groupPower: 'Pouvoir du groupe',
    /** `seconds` in minutes when they make whole minutes: « 5 min », « 30 s ». */
    duration: (seconds: number) =>
      seconds >= 60 && seconds % 60 === 0 ? `${n(seconds / 60)} min` : `${n(seconds)} s`,
    fromAdrenaline: (duration: string, adrenaline: number) =>
      `${duration} dès ${n(adrenaline)} d'adrénaline`,
    /** « Bibelot · 30 s dès 65 d'adrénaline ». */
    tag: (kind: string, lasting: string) => `${kind} · ${lasting}`,
    /** The first change on the line of how long it lasts: « 10 min · Glace ×0,5 ». */
    firstLine: (lasting: string, change: string) => `${lasting} · ${change}`,
    armor: (value: number) => `armure +${n(value)}`,
    armorTimes: (multiplier: number) => `armure ×${n(multiplier)}`,
    parry: (multiplier: number) => `VD en parade ×${n(multiplier)}`,
    /** `multiplier` of the stagger taken: 0,5 staggers you twice more slowly. */
    stagger: (multiplier: number) => `tu titubes ${n(1 / multiplier)}× moins vite`,
    blockGivesBack: (stamina: number) => `bloquer rend ${n(stamina)} d'endurance`,
    /** `share` in percent, below zero for less. */
    blockStamina: (share: number) => `bloquer coûte ${staminaShare(share)}`,
    dodgeStamina: (share: number) => `esquiver coûte ${staminaShare(share)}`,
    /** Eikthyr's and The Elder's powers. */
    noHit: 'ne change aucun coup',
    card: 'Avec tes effets temporaires',
    group: 'Tes effets temporaires',
    noneOn: 'Aucun allumé',
    on: (names: readonly string[]) =>
      new Intl.ListFormat('fr', { type: 'conjunction' }).format(names),
    holds: "Vaut jusqu'à ce que tu changes de créature.",
    /** Why it changes nothing, in brief: « Ne change rien : pas de feu ». */
    idle: (reason: string) => `Ne change rien : ${reason}`,
    idleHere: 'Ne change rien ici',
    idleNoHit: 'Ne change aucun coup',
    notDealt: (types: readonly string[]) => `pas ${noneOf(types)}`,
    /** What already gives as much of what an effect would: « Ne change rien : déjà couvert par ta cape ». */
    coveredBy: {
      helmet: 'déjà couvert par ton casque',
      chest: 'déjà couvert par ton plastron',
      legs: 'déjà couvert par tes jambières',
      cape: 'déjà couvert par ta cape',
      set: 'déjà couvert par ton ensemble',
      trinket: 'déjà couvert par ton bibelot',
      power: 'déjà couvert par ton pouvoir',
      consumable: 'déjà couvert par ta boisson',
    },
    /** A group's power, by its name in the game. */
    coveredByPower: (power: string) => `déjà couvert par ${theName(power)}`,
    /** Wet, by its name in the game: « déjà couvert par Humide ». */
    coveredByWeather: (wet: string) => `déjà couvert par ${wet}`,
    setupLine: (names: readonly string[]) =>
      `Effets temporaires allumés : ${new Intl.ListFormat('fr', { type: 'conjunction' }).format(names)}`,
  },
  barrier: {
    /** Who it covers and for how long, by the staff's name in the game. */
    lede: (staff: string, radius: number, from: number, to: number) =>
      `Le ${staff} la pose sur qui le lance et sur les joueurs à moins de ${n(radius)} m, pour ${n(from)} à ${n(to)} min selon son niveau. Tu l'allumes ensuite sur la fiche d'une créature ou dans la Simulation.`,
    /** By the skill's name in the game. */
    skill: (skill: string) => `${skill} de qui la lance`,
    lower: (skill: string) => `Moins de ${skill}`,
    raise: (skill: string) => `Plus de ${skill}`,
    absorbs: 'Elle absorbe',
    how: (base: number, perLevel: number, skill: string) =>
      `${n(base)}, plus ${n(perLevel)} par niveau de ${skill}. Elle compte tout le coup, hache et pioche comprises, et absorbe en entier celui qui la brise.`,
    add: 'Ajouter',
    remove: 'Retirer la barrière',
    /** On the card: « Du groupe · absorbe 300 · 1 à 4 min ». */
    tag: (capacity: number, from: number, to: number) =>
      `Du groupe · absorbe ${n(capacity)} · ${n(from)} à ${n(to)} min`,
    /** Under an attack: how many such hits it takes; what it counts, when not what the attack lists. */
    hits: (hits: number, counted: number | null) =>
      `Barrière : ${n(hits)} ${hits > 1 ? 'coups' : 'coup'}${counted === null ? '' : ` (compte ${n(counted)})`}`,
    /** Above the Simulation's advice, by its name in the game. */
    takes: (name: string, hits: number, counted: number) =>
      `${name} : elle prend ${n(hits)} ${hits > 1 ? 'coups' : 'coup'} comme celui-ci (compte ${n(counted)}), puis :`,
  },
  weather: {
    label: 'Météo',
    /** Wet holds for the biome the Bestiary shows, by its name in the game. */
    note: (biome: BiomeId, name: string) =>
      `Compté pour toutes les créatures ${ofBiome(biome, name)}, jusqu'à ce que tu l'éteignes ou changes de biome.`,
    /** Beside a biome's name while Wet is on there: « Prairies · Humide ». */
    beside: (biome: string, wet: string) => `${biome} · ${wet}`,
  },
  world: {
    summary: (difficulty: string, count: number) =>
      `Ton monde : combat ${difficulty.toLocaleLowerCase('fr')}, ${players(count)}`,
    playersAndScale: (count: number, enemyScale: number) => `${players(count)} · ×${n(enemyScale)}`,
    title: 'Ton monde',
    difficulty: 'Difficulté du combat',
    multiplier: (value: number) => `×${n(value)}`,
    difficultyNote: `Le réglage ${quoted('Combat')} des modificateurs du monde.`,
    players: (range: number) => `Joueurs à moins de ${n(range)} m, toi compris`,
    orMore: (count: number) => `${n(count)}+`,
    orMoreLabel: (count: number) => `${n(count)} ou plus`,
    effects: 'Ce que ça donne',
    enemyHits: 'Coups des monstres',
    yourDamage: 'Tes dégâts et ton stagger',
    yourDamageShort: 'Tes dégâts',
    starChance: "Chance d'étoiles",
    sizeAndSpeed: 'Taille et vitesse au sol',
    rulesNote:
      'Taille et vitesse : hors donjons. Les règles (fenêtre de parade, seuils) et le rythme des attaques ne changent pas.',
  },
  verdicts: {
    block: 'Blocage',
    parry: 'Parade',
    dodge: 'Esquive',
    holds: 'tient',
    staggered: 'tu titubes',
    broken: 'ne passe pas',
    unblockable: 'imparable',
    cannotParry: 'ne pare pas',
    nothing: 'aucune attaque directe',
    dodgeable: 'esquivable',
    undodgeable: 'inesquivable',
    pill: (guard: string, word: string) => `${guard} : ${word}`,
  },
  advice: {
    unknown: 'Aucune attaque directe',
    blockAll: 'Tu bloques tout sans tituber',
    parryAll: (block: 'staggered' | 'broken') =>
      `Pare-le : ${block === 'broken' ? 'le blocage cède' : 'en bloquant, tu titubes'}`,
    dodgeAll: (rolls: boolean, canParry: boolean) =>
      `${rolls ? 'Esquive' : 'Évite'} tout : même ${canParry ? 'parées' : 'bloquées'}, ses attaques passent`,
    dodgeSome: (rolls: boolean, attacks: readonly string[], rest: 'block' | 'parry') =>
      `${rolls ? 'Esquive' : 'Évite'} ${attacks.length === 1 ? quoted(attacks[0]!) : `${n(attacks.length)} attaques`}, ${rest === 'block' ? 'bloque' : 'pare'} le reste`,
  },
  bestiary: {
    intro: 'Comment prendre chaque créature avec ton équipement.',
    search: 'Rechercher dans tous les biomes',
    searchPlaceholder: 'Monstre ou attaque, tous biomes',
    clearSearch: 'Effacer la recherche',
    biome: 'Biome',
    previousBiome: (name: string) => `Biome précédent : ${name}`,
    nextBiome: (name: string) => `Biome suivant : ${name}`,
    biomeCount: (index: number, total: number, count: number) =>
      `Biome ${n(index)} sur ${n(total)} · ${plural(count, 'créature', 'créatures')}`,
    howToTake: 'Comment le prendre',
    withoutEffects: 'Sans tes effets temporaires',
    creatures: 'Créatures du biome',
    health: (health: number) => `${n(health)} PV`,
    boss: 'Boss',
    foundCreatures: (count: number) => `Créatures · ${n(count)}`,
    foundAttacks: (count: number) => `Attaques · ${n(count)}`,
    nothingFound: (query: string) => `Rien pour ${quoted(query)}`,
    searchNote:
      "Résultats sur tous les biomes. Une attaque ouvre la fiche de sa créature, d'où tu peux la simuler.",
  },
  creature: {
    back: 'Retour',
    stars: 'Étoiles',
    star: (stars: number) => `${n(stars)}★`,
    health: 'Points de vie',
    healthShort: 'PV',
    toInflict: 'À infliger',
    neverStaggers: 'Ne titube jamais',
    yourParry: 'Ta parade',
    parryStaggers: 'Le fait tituber',
    parryDoesNot: 'Ne le fait pas tituber',
    cannotParry: 'Ton objet ne pare pas',
    modifiers: 'Faiblesses et résistances',
    modifiersOn: (part: string) => `Faiblesses et résistances · ${part}`,
    body: 'Corps',
    /** `state` is null for a tool taken normally: the game has no word for it. */
    modifier: (type: string, state: string | null, multiplier: number) =>
      state === null ? `${type} ×${n(multiplier)}` : `${type} · ${state} ×${n(multiplier)}`,
    everythingElse: 'Tout le reste ×1',
    noModifier: 'Tout ×1',
    attacks: 'Ses attaques',
    attack: 'Attaque',
    damage: 'Dégâts',
    damageShort: 'Dég.',
    range: 'Portée',
    simulate: 'Simuler',
    kinds: { melee: 'Mêlée', area: 'Zone', projectile: 'Projectile', summon: 'Invocation' },
    metres: (metres: number) => `${n(metres)} m`,
    phase: (index: number, health: number) => `Phase ${n(index)} · ${n(health)} PV`,
    noAttack: 'Aucune attaque',
    trample: 'Écrasement',
    whenRunning: 'En course',
    deathBlast: 'Explosion',
    onDeath: (phase: boolean): string => (phase ? 'Fin de la phase' : 'À sa mort'),
    count: (min: number, max: number) => (min === max ? `×${n(min)}` : `×${n(min)}–${n(max)}`),
    seeSheet: 'Voir sa fiche',
    sheet: 'Sa fiche',
    attackSummary: ({ name, types, damage, block, parry, dodgeable }: AttackWords) =>
      damage === null
        ? `${name}, invocation.`
        : `${name}, ${listOf(types)}, ${n(damage)} dégâts. Blocage : ${block}. Parade : ${parry}. ${dodgeable ? 'Esquivable' : 'Inesquivable'}.`,
    openSimulation: 'Ouvrir la simulation.',
    openSheet: (creature: string) => `Ouvrir la fiche ${creature}.`,
    simulateLabel: (name: string, damage: number) => `Simuler : ${name}, ${n(damage)} dégâts`,
    tapToSimulate: 'Touche une attaque pour la simuler.',
    desktopNote:
      "Simuler ouvre l'attaque dans la Simulation, avec la barre de stagger et l'endurance.",
  },
  simulation: {
    intro: 'Choisis une attaque : la page te dit comment la prendre avec ton équipement.',
    source: 'Source du coup',
    modes: { attack: "Attaque d'un monstre", value: 'Valeur libre' },
    hit: 'Le coup',
    change: 'Changer',
    changeLabel: (creature: string, attack: string, damage: number) =>
      `Changer d'attaque : ${creature}, ${attack}, ${n(damage)} dégâts`,
    noAttack: 'Aucune attaque choisie',
    pick: 'Choisir une attaque',
    stars: 'Étoiles du monstre',
    starsShort: 'Étoiles',
    value: 'Dégâts du coup',
    lower: 'Baisser de 5',
    raise: 'Monter de 5',
    valueNote: 'Dégâts de base du coup, avant difficulté et joueurs proches.',
    bar: 'Barre de stagger avant le coup',
    barOption: (percent: number) => `${n(percent)} %`,
    result: 'Résultat',
    blocking: 'En bloquant',
    parrying: 'En parant',
    taken: 'subis',
    stamina: (stamina: number) =>
      stamina > 0
        ? `−${n(stamina)} endurance`
        : stamina < 0
          ? `+${n(-stamina)} endurance`
          : '0 endurance',
    barTotal: (total: number, limit: number) => `barre : ${n(total)} / ${n(limit)}`,
    barOverflows: 'barre : déborde',
    barLabel: (total: number, limit: number, overflows: boolean) =>
      `Barre de stagger : ${n(total)} sur ${n(limit)}${overflows ? ', elle déborde' : ''}`,
    /** The bar from the lowest roll to the highest, while « Détails » is open. */
    barRangeLabel: (low: number, top: number, limit: number, overflows: boolean) =>
      overflows
        ? `Barre de stagger : ${n(low)} sur ${n(limit)} au plus bas, elle peut déborder`
        : `Barre de stagger : ${range(low, top)} sur ${n(limit)}`,
    details: {
      title: 'Détails',
      rolled: (lowest: number) => `Chaque coup varie de ${n(lowest)} à 100 %`,
      unrolled: 'Ce coup ne varie pas',
      range: (low: number, top: number) => range(low, top),
      /** `low` is the verdict of the lowest roll, `top` that of the highest, `times` in `of` rolls. */
      odds: (guard: Guard, top: Verdict, times: number, of: number, low: Verdict) =>
        `${outcome(guard, top)} ${n(times)} fois sur ${n(of)}, sinon ${outcome(guard, low)}`,
      /** `type` is the game's name of the damage; `low` is 0 when the lowest roll starts nothing. */
      overTime: (type: string, low: OverTimeRange, top: OverTimeRange) =>
        `puis ${low.damage === 0 ? `jusqu'à ${n(top.damage)}` : range(low.damage, top.damage)} ${noneOf([type])} en ${low.seconds === 0 ? n(top.seconds) : range(low.seconds, top.seconds)} s`,
      // Spirit only deals damage, as the game says it: no verb of its own.
      fizzled: (type: string, kind: OverTimeKind) =>
        kind === 'spirit'
          ? `trop peu de dégâts ${noneOf([type])} passent`
          : `trop peu ${noneOf([type])} passe pour ${kind === 'burning' ? 'brûler' : 'empoisonner'}`,
      bar: (low: number, top: number, limit: number) => `barre ${range(low, top)} / ${n(limit)}`,
    },
    dodgeable: 'Esquivable en roulade',
    undodgeable: 'Pas esquivable en roulade',
    hits: (count: number) =>
      `Cette attaque porte ${n(count)} coups : chaque carte montre le plus dur.`,
    thresholds: 'Tes seuils sont dans Ton équipement',
    advice: {
      block: 'Bloque-le : tu tiens sans tituber',
      parry: (block: 'staggered' | 'broken') =>
        `Pare-le : ${block === 'broken' ? 'le blocage cède' : 'en bloquant, tu titubes'}`,
      /** `dodgeable` is null for a free value, which no roll is known to avoid. */
      dodge: (
        dodgeable: boolean | null,
        guard: 'block' | 'parry',
        setback: 'staggered' | 'broken' | 'unblockable',
      ) => {
        if (setback === 'unblockable') {
          if (dodgeable === null) return 'Imparable : esquive si tu peux'
          return dodgeable ? 'Imparable : esquive-le' : 'Imparable : éloigne-toi'
        }
        const why =
          guard === 'parry'
            ? setback === 'broken'
              ? 'même la parade cède'
              : 'même paré, tu titubes'
            : setback === 'broken'
              ? 'le blocage cède'
              : 'en bloquant, tu titubes'
        if (dodgeable === null) return `${capitalised(why)} : esquive si tu peux`
        return `${dodgeable ? 'Esquive' : 'Évite'}-le : ${why}`
      },
    },
  },
  picker: {
    title: 'Choisir une attaque',
    close: 'Fermer',
    search: 'Rechercher un ennemi ou une attaque',
    searchPlaceholder: 'Ennemi ou attaque, tous biomes',
    recent: 'Récentes',
    enemies: 'Ennemis',
    biomeCount: (index: number, total: number) => `Biome ${n(index)} sur ${n(total)}`,
    attackCount: (count: number) => plural(count, 'attaque', 'attaques'),
    enemiesNote: "Touche un ennemi pour voir ses attaques, puis l'attaque à simuler.",
    attacksNote:
      "Clique une attaque pour l'ouvrir dans la Simulation. Dégâts à l'étoile la plus basse : les étoiles se règlent là-bas.",
    foundAttacks: (count: number) => `Attaques · ${n(count)}`,
    foundEnemies: (count: number) => `Ennemis · ${n(count)}`,
    noAttack: (query: string) => `Aucune attaque ne correspond à ${quoted(query)}.`,
    noEnemy: (query: string) => `Aucun ennemi ne correspond à ${quoted(query)}.`,
    openNote: "Toucher une attaque l'ouvre directement dans la Simulation.",
    resultsNote: 'Résultats sur tous les biomes.',
  },
  arsenal: {
    families: { hand: 'En main', armor: "Pièces d'armures", carry: 'Ce que tu emportes' },
    familiesShort: { hand: 'En main', armor: 'Armures', carry: 'À emporter' },
    family: 'Famille',
    category: 'Catégorie',
    nav: "Catégories de l'Arsenal",
    categories: {
      shields: 'Boucliers',
      weapons: 'Armes',
      others: 'Autres',
      helmets: 'Casques',
      chests: 'Plastrons',
      legs: 'Jambières',
      capes: 'Capes',
      powers: 'Pouvoirs',
      trinkets: 'Bibelots',
      drinks: 'Boissons',
    },
    item: {
      shields: 'Bouclier',
      weapons: 'Arme',
      others: 'Objet',
      helmets: 'Casque',
      chests: 'Plastron',
      legs: 'Jambières',
      capes: 'Cape',
      powers: 'Pouvoir',
      trinkets: 'Bibelot',
      drinks: 'Boisson',
    },
    /** Before the skill, which the page sets apart. */
    atLevelOne: 'Au niveau 1, avec ta compétence Blocage',
    pickLevel: {
      hand: ' ; touche-en un pour choisir son niveau dans Ton équipement.',
      armor: 'Au niveau 1 ; touche-en une pour choisir son niveau dans Ton équipement.',
    },
    carryLede:
      "Lu dans le jeu : les pouvoirs, et les bibelots et boissons qui changent un combat. L'emporter l'ajoute à Ton équipement ; tu l'allumes sur la fiche d'une créature ou dans la Simulation.",
    powersLede:
      "Lu dans le jeu : les pouvoirs, et les bibelots et boissons qui changent un combat. Équiper un pouvoir en fait le tien dans Ton équipement ; tu l'allumes sur la fiche d'une créature ou dans la Simulation.",
    sort: 'Trier par',
    columns: {
      type: 'Type',
      power: 'VD',
      parry: 'En parade',
      armor: 'Armure',
      perLevel: 'Par niveau',
      resistances: 'Résistances et faiblesses',
      set: 'Ensemble',
      duration: 'Durée',
      cooldown: 'Recharge',
      trigger: 'Se déclenche',
      action: 'Action',
    },
    changes: {
      powers: "Ce qu'il change",
      trinkets: "Ce qu'il change",
      drinks: "Ce qu'elle change",
    },
    perLevel: (armor: number) => (armor > 0 ? `+${n(armor)}` : '—'),
    cooldown: (duration: string) => `recharge ${duration}`,
    trigger: (adrenaline: number) => `dès ${n(adrenaline)} d'adrénaline`,
    setLine: (set: string, size: number, changes: string) =>
      `Ensemble ${set}, ${n(size)} pièces : ${changes}`,
    setSize: (size: number) => `${n(size)} pièces`,
    equipped: 'Équipé',
    carried: 'Emporté',
    /** A power the group casts on you. */
    group: 'Du groupe',
    equip: 'Équiper',
    carry: 'Emporter',
    equipLabel: (item: string) => `Équiper : ${item}`,
    carryLabel: (item: string) => `Emporter : ${item}`,
    choose: 'Choisir',
    chooseLabel: (item: string) => `Choisir : ${item}`,
    takeOff: 'Retirer',
    /** A row of a list of Your gear: picking it goes back there with it. */
    pickLabel: (item: string, state: 'equipped' | 'carried' | 'group' | null) =>
      `${item}${state === null ? '' : rowState[state]}. Choisir.`,
    rowLabel: (item: string, state: 'equipped' | 'carried' | 'group' | null) =>
      `${item}${state === null ? '' : rowState[state]}. Ouvrir dans Ton équipement.`,
    search: "Rechercher dans tout l'Arsenal",
    searchPlaceholder: 'Objet, pièce ou effet, partout',
    searchPlaceholderShort: 'Rechercher partout',
    clearSearch: 'Effacer la recherche',
    found: (results: number, categories: number) =>
      `${plural(results, 'résultat', 'résultats')} dans ${plural(categories, 'catégorie', 'catégories')}`,
    foundFor: (results: number, query: string, categories: number) =>
      `${plural(results, 'résultat', 'résultats')} pour ${quoted(query)}, dans ${plural(categories, 'catégorie', 'catégories')}.`,
    seeAll: (count: number, category: string) =>
      `Voir les ${n(count)} ${category.toLocaleLowerCase('fr')}`,
    nothingFound: (query: string) => `Rien pour ${quoted(query)}`,
  },
  guide: {
    intro: (version: string) => `Les règles du combat, lues dans Valheim ${version}.`,
    search: 'Rechercher dans le mémo',
    searchPlaceholder: 'Rechercher une règle',
    clearSearch: 'Effacer la recherche',
    rules: 'Règles',
    contents: 'Sommaire du mémo',
    noMatch: (query: string) => `Aucune règle ne correspond à ${quoted(query)}.`,
  },
  modal: { close: 'Fermer sans enregistrer', cancel: 'Annuler', save: 'Valider' },
  report: {
    fromCreature: 'Un chiffre ou un nom faux ? Signale-le',
    fromVerdict: 'Ce verdict te paraît faux ? Signale-le',
    fromSettings: 'Signaler un problème ou une idée',
    title: 'Signaler',
    close: 'Fermer',
    kinds: 'Ce que tu signales',
    kind: { data: 'Donnée fausse', bug: 'Bug', idea: 'Idée' },
    whichLine: 'Quelle ligne ?',
    optional: 'facultatif',
    weaknesses: 'Faiblesses',
    message: 'Ton message',
    text: {
      data: "Qu'est-ce qui est faux ?",
      bug: "Qu'est-ce qui s'est passé ?",
      idea: 'Ton idée',
    },
    textHint: {
      data: 'Dans le jeu, elle fait 60, pas 70.',
      bug: "La fiche reste vide quand je change d'étoiles.",
      idea: 'Voir les attaques des boss phase par phase.',
    },
    game: 'Ce que montre le jeu',
    gameHint: '60, ou un autre nom',
    nickname: 'Ton pseudo, pour te remercier',
    nicknameHint: 'Ton pseudo',
    attached: 'Joint au signalement',
    attachedSummary: "Version, données, ce que l'écran affiche, ton contexte",
    device: (version: string, gameVersion: string) =>
      `${APP_NAME} ${version} · lues dans Valheim ${gameVersion}`,
    screen: (
      language: Language,
      screen: 'creature' | 'simulation' | 'settings' | 'app' | 'bestiary' | 'arsenal' | 'guide',
      width: number,
    ) =>
      [
        { fr: 'Français', en: 'Anglais' }[language],
        ...(screen === 'app'
          ? []
          : [
              {
                creature: 'fiche monstre',
                simulation: 'Simulation',
                settings: 'Réglages',
                bestiary: 'Bestiaire',
                arsenal: 'Arsenal',
                guide: 'Mémo',
              }[screen],
            ]),
        `écran de ${n(width)} px`,
      ].join(' · '),
    crashText: 'Ce que tu faisais',
    crashHint: {
      creature: "J'ai passé le Troll à 2★.",
      bestiary: "J'ai changé de biome.",
      simulation: "J'ai choisi une attaque.",
      arsenal: "J'ai changé de niveau.",
      guide: "J'ai ouvert une règle.",
      app: `J'ai ouvert ${APP_NAME}.`,
    },
    crashSummary: "Version, écran, l'erreur et sa pile",
    moreLines: (count: number) => `… ${plural(count, 'ligne', 'lignes')} de plus`,
    nothingElse: "Rien d'autre : ni adresse IP, ni identifiant.",
    public: 'Ton signalement devient public sur GitHub, avec ton pseudo si tu en donnes un.',
    send: 'Envoyer',
    sending: 'Envoi…',
    cancel: 'Annuler',
    received: "Reçu, c'est le",
    receivedNote: 'Il est public sur GitHub. Merci : chaque correction sert à tous les joueurs.',
    view: 'Voir sur GitHub',
    queued: 'Gardé sur ton appareil',
    queuedNote: `Il n'a pas pu partir pour l'instant. Il partira tout seul dès que le réseau revient, ou à la prochaine ouverture de ${APP_NAME}.`,
    refused: 'Refusé par le serveur',
    refusedNote:
      'Il ne partira pas tel quel. Écris-le plutôt sur GitHub, où chaque formulaire te guide.',
    onGitHub: 'Ouvrir un ticket sur GitHub',
    done: 'Fermer',
  },
  crash: {
    sheetTitle: 'Cette fiche a planté',
    sheetNote: `Le reste de ${APP_NAME} marche : change de monstre, ou passe à la Simulation.`,
    retry: 'Réessayer',
    appTitle: `${APP_NAME} a planté`,
    appNote:
      'Tes réglages, ton équipement et ton monde restent sur cet appareil : recharge pour reprendre.',
    reload: 'Recharger',
    send: 'Envoyer le rapport',
    trust: "Rien ne part sans toi : le rapport n'est envoyé que si tu le demandes.",
    screens: {
      bestiary: {
        title: 'Le Bestiaire a planté',
        note: `Le reste de ${APP_NAME} marche : passe à la Simulation, à l'Arsenal ou au Mémo.`,
      },
      simulation: {
        title: 'La Simulation a planté',
        note: `Le reste de ${APP_NAME} marche : passe au Bestiaire, à l'Arsenal ou au Mémo.`,
      },
      arsenal: {
        title: "L'Arsenal a planté",
        note: `Le reste de ${APP_NAME} marche : passe au Bestiaire, à la Simulation ou au Mémo.`,
      },
      guide: {
        title: 'Le Mémo a planté',
        note: `Le reste de ${APP_NAME} marche : passe au Bestiaire, à la Simulation ou à l'Arsenal.`,
      },
    },
    row: 'Cette ligne a planté',
    report: 'Signaler',
  },
  loop: {
    feedback: 'Tes retours',
    reports: 'Mes signalements',
    reportsSummary: (sent: number, fixed: number) =>
      `${plural(sent, 'envoyé', 'envoyés')} · ${plural(fixed, 'corrigé', 'corrigés')}`,
    noReports: 'Aucun signalement envoyé depuis cet appareil.',
    reportsNote:
      'Envoyés depuis cet appareil. Leur état vient de GitHub quand tu es en ligne ; ouvre-en un pour le voir.',
    columns: { subject: 'Sujet', number: 'N°', date: 'Date', state: 'État' },
    states: {
      waiting: "En attente d'envoi",
      sent: 'Envoyé',
      open: 'Ouvert',
      fixedIn: (version: string) => `Corrigé dans ${version}`,
      fixedNext: 'Corrigé, dans la prochaine version',
      duplicate: 'Fermé · déjà signalé',
      declined: 'Fermé · non retenu',
    },
    news: 'Nouveautés',
    noteKinds: { new: 'Nouveau', improved: 'Amélioré', fixed: 'Corrigé' },
    newsSummary: (version: string, date: string) => `${version} · ${date}`,
    thanks: (names: readonly string[]) =>
      `Merci ${new Intl.ListFormat('fr', { type: 'conjunction' }).format(names)}`,
    yours: (numbers: readonly number[]) =>
      `${numbers.length > 1 ? 'tes signalements' : 'ton signalement'} ${numbers.map((number) => `#${String(number)}`).join(', ')}`,
    back: 'Retour aux réglages',
    close: 'Fermer',
    thanksTitle: 'Corrigé grâce à toi',
    thanksBody: (count: number, version: string, nickname: string | undefined) =>
      `${count > 1 ? 'Tes signalements sont corrigés' : 'Ton signalement est corrigé'} dans ${version}. Merci${nickname ? `, ${nickname}` : ''} : chaque correction sert à tous les joueurs.`,
    seeNews: 'Voir les nouveautés',
  },
  settings: {
    title: 'Réglages',
    language: 'Langue',
    automatic: 'Automatique',
    languageNote: (detected: Language) =>
      `Automatique suit ton appareil (${detected === 'fr' ? 'français' : 'anglais'} détecté), sinon l'anglais. Les noms du jeu suivent la langue choisie.`,
    theme: 'Thème',
    byDefault: 'Par défaut',
    themeNote: "Gardés sur cet appareil. L'aperçu change dès que tu touches un choix.",
    themeNoteDesktop: "L'aperçu change dès que tu choisis.",
    about: 'À propos',
    dataSource: (version: string) => `Lues dans Valheim ${version} · sans mod`,
    source: 'Code source et licence',
    licence: (copyright: string) => `${copyright} · logiciel libre sous GPLv3, sans garantie.`,
    themes,
  },
  // {wiki}, {licence} and {email} stand for links.
  notices: {
    title: 'Mentions et crédits',
    rowMeta: 'Projet de fan, crédits, tes données',
    fan: 'Projet de fan',
    fanText: `${APP_NAME} est un projet de fan, non officiel : ni Iron Gate ni Coffee Stain ne l'ont fait ni approuvé. Valheim, et les noms et données tirés du jeu, appartiennent à Iron Gate.`,
    credits: 'Crédits',
    wikiText:
      "Noms d'attaques : en partie tirés du {wiki}, écrits par ses contributeurs, sous licence {licence}. Les noms français en sont pour la plupart des traductions.",
    wiki: 'wiki Valheim',
    fonts: 'Polices : IBM Plex Sans et IBM Plex Mono, © IBM Corp., sous SIL Open Font License 1.1.',
    libraries: 'Bibliothèques : React, © Meta Platforms, et Workbox, © Google, sous licence MIT.',
    licenceTexts: 'Textes complets des licences',
    data: 'Tes données',
    device:
      "Tes réglages, ton équipement et la liste de tes signalements restent sur cet appareil. Pas de compte, pas de cookie, pas de mesure d'audience.",
    reports:
      "Un signalement devient une issue publique sur GitHub, envoyée par Vercel : ton texte, ton pseudo si tu en donnes un, et ce que l'app joint. Ton pseudo peut aussi paraître dans les Nouveautés, pour te remercier.",
    network:
      "Pour suivre tes signalements, l'app demande leur état à GitHub. Comme pour tout site, Vercel, qui sert l'app, et GitHub voient l'adresse IP de ta connexion ; elle n'est jamais jointe à un signalement.",
    removal: 'Pour faire retirer un signalement ou ton pseudo, écris à {email}.',
    legal: 'Mentions légales',
    publisher: `Éditeur : ${PUBLISHER}, à titre non professionnel.`,
    host: 'Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis.',
  },
  arrival: {
    /** Above a list of Ton équipement opened from the question. */
    listKicker: 'Question 2 · Ton équipement',
    step: (index: number, count: number) => `${n(index)} sur ${n(count)}`,
    skip: 'Passer',
    next: 'Suivant',
    previous: 'Précédent',
    previousLabel: 'Question précédente',
    where: 'Où en es-tu ?',
    whereLead: 'Le biome où tu te bats en ce moment.',
    gearLead: 'Ce que tu tiens en main gauche, et tes stats défensives.',
    worldLead: `Le réglage ${quoted('Combat')} de ton monde, et qui joue avec toi.`,
    see: (biome: BiomeId, name: string) => `Voir ${biomeArticles[biome]}${name}`,
  },
  install: {
    title: `Installe ${APP_NAME}`,
    lead: "Pour l'avoir sous la main, à côté du jeu.",
    perks: {
      phone: [
        "Une icône sur ton écran d'accueil",
        "En plein écran, sans barre d'adresse",
        'Marche sans connexion',
      ],
      desktop: [
        'Une icône à côté de tes autres apps',
        "Sa propre fenêtre, sans barre d'adresse",
        'Marche sans connexion',
      ],
    },
    inSafari: 'Dans Safari',
    // {more} and {share} stand for Safari's buttons, drawn.
    steps: {
      'ios-menu': [
        `Touche {more} à côté de l'adresse, puis ${quoted('Partager')}.`,
        `Choisis ${quoted("Sur l'écran d'accueil")}, puis ${quoted('Ajouter')}.`,
        `Ouvre ${APP_NAME} depuis ton écran d'accueil.`,
      ],
      'ios-bar': [
        `Touche {share} ${quoted('Partager')} dans la barre de Safari.`,
        `Choisis ${quoted("Sur l'écran d'accueil")}, puis ${quoted('Ajouter')}.`,
        `Ouvre ${APP_NAME} depuis ton écran d'accueil.`,
      ],
      mac: [
        `Dans la barre des menus, choisis Fichier › ${quoted('Ajouter au Dock')}.`,
        `Ouvre ${APP_NAME} depuis le Dock.`,
      ],
    },
    first:
      "Fais-le avant de régler quoi que ce soit : l'app installée ne reprend pas ce que tu règles dans Safari.",
    later:
      "L'app installée repart de zéro : Safari ne lui passe pas tes réglages, tu les y refais une fois.",
    install: 'Installer',
    continueInBrowser: 'Continuer dans le navigateur',
    continueInSafari: 'Continuer dans Safari',
    inSettings: 'Tu la retrouves dans Réglages › À propos.',
    row: `Installer ${APP_NAME}`,
    rowMeta: "Sur l'écran d'accueil, sans connexion",
    close: 'Fermer',
  },
}

export type Catalog = typeof fr
