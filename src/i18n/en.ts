import { APP_NAME, PUBLISHER } from '@/app/brand'
import type { Guard, Verdict } from '@/combat/hit'
import { formatNumber } from './format'
import type { Catalog } from './fr'

const n = (value: number) => formatNumber(value, 'en')
const plurals = new Intl.PluralRules('en')
const plural = (count: number, one: string, other: string) =>
  `${n(count)} ${plurals.select(count) === 'one' ? one : other}`
const players = (count: number) => plural(count, 'player', 'players')
const rowState = { equipped: ', equipped', carried: ', carried', group: ', from the group' }
const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`
const listOf = (words: readonly string[]) =>
  new Intl.ListFormat('en', { type: 'conjunction' }).format(
    words.map((word) => word.toLocaleLowerCase('en')),
  )
const quoted = (name: string) => `“${name}”`
const range = (low: number, top: number) => (low === top ? n(top) : `${n(low)} to ${n(top)}`)
// What a guard comes to, as Details says how often.
const outcome = (guard: Guard, verdict: Verdict) =>
  verdict === 'broken'
    ? guard === 'block'
      ? 'the block gives way'
      : 'the parry gives way'
    : verdict === 'staggered'
      ? 'you stagger'
      : 'you hold'
const staminaShare = (share: number) =>
  `${n(Math.abs(share))}% ${share < 0 ? 'less' : 'more'} stamina`

export const en: Catalog = {
  screens: { bestiary: 'Bestiary', simulation: 'Simulation', arsenal: 'Arsenal', guide: 'Guide' },
  shell: {
    navigation: 'Navigation',
    mainNavigation: 'Main navigation',
    settings: 'Settings',
    context: 'Your setup',
    contextSummary: (blockPower, enemyScale, wet) =>
      `Your setup: Block ${n(blockPower)} ×${n(enemyScale)}${wet ? ', wet' : ''}`,
    contextPower: (blockPower) => `Block ${n(blockPower)}`,
    contextScale: (enemyScale) => `×${n(enemyScale)}`,
    contextNote: 'Every verdict hangs on it',
  },
  gear: {
    summary: (item, level, blockPower, skill) =>
      `Your gear: ${item}${level === null ? ',' : ` level ${n(level)},`} block power ${n(blockPower)}, Blocking skill ${n(skill)}`,
    levelAndPower: (level, blockPower) =>
      level === null ? `Block ${n(blockPower)}` : `Lv${n(level)} · Block ${n(blockPower)}`,
    bodySummary: (armor, health, pieces) =>
      pieces === null
        ? `Armor ${n(armor)}, typed · ${n(health)} max HP`
        : `Armor ${n(armor)} · ${n(health)} max HP${pieces.length > 0 ? `: ${pieces.join(', ')}` : ''}`,
    title: 'Your gear',
    withstand: 'What you can take',
    emptyBar: 'Empty bar',
    block: 'Block',
    parry: 'Parry',
    power: (power) => `power ${n(power)}`,
    unstaggered: 'no stagger',
    unbroken: 'holds',
    cannotParry: "your item can't parry",
    staggersAt: (limit, share, health, armor) =>
      `Staggers at ${n(limit)} (${n(share)}% of ${n(health)} HP) · armor ${n(armor)}`,
    powerParts: (base, skill) => `power = ${n(base)} × ${n(skill)}`,
    held: 'In hand',
    handsFree: 'puts down what you hold',
    groupTags: {
      round: 'Round',
      buckler: 'Buckler',
      tower: 'Tower',
      weapon: 'Weapon',
      other: 'Other',
    },
    parryBonus: (bonus) => `×${n(bonus)}`,
    noParry: "can't parry",
    lowerLevel: 'Lower level',
    raiseLevel: 'Higher level',
    levelOf: (row, level) => (level === null ? `${row}: none` : `${row}: level ${n(level)}`),
    lowerLevelOf: (row) => `${row}: lower level`,
    raiseLevelOf: (row) => `${row}: higher level`,
    levelValue: (level) => `Lv${n(level)}`,
    skill: 'Blocking skill',
    lowerSkill: 'Less skill',
    raiseSkill: 'More skill',
    pieces: 'Armor pieces',
    slots: { helmet: 'Helmet', chest: 'Chest', legs: 'Legs', cape: 'Cape' },
    noPiece: 'None',
    armor: 'Armor',
    armorParts: (parts) => parts.map(n).join(' + '),
    typedArmor: 'Armor typed in an earlier version: pick your pieces to replace it.',
    resistances: 'Your resistances',
    fullSet: 'Full set',
    setModifier: (types, multiplier) =>
      `${new Intl.ListFormat('en', { type: 'conjunction' }).format(types)} ×${n(multiplier)}`,
    dodgeCost: (share) => `Dodging costs ${n(share)}% less stamina`,
    health: 'Max HP',
    lowerHealth: 'Less HP',
    raiseHealth: 'More HP',
    carry: 'What you carry',
    rowValue: (row, value) => `${row}: ${value}`,
    noTrinket: 'None',
    noPower: 'None',
    noDrink: 'None',
    addDrink: 'Add a drink',
    carriedNote:
      "Not counted by default: switch them on in a creature's sheet or in the Simulation, while they are active.",
    group: 'From the group',
    groupNote:
      'What a player casts near you; switch it on like yours. The Magic barrier hangs on the Blood Magic of its caster.',
    addGroupPower: 'Add a group power',
    addBarrier: 'Add a Magic barrier',
    barrierCast: (skill, level) => `Cast with ${skill} ${n(level)}`,
    barrierLines: (from, to, capacity) => `${n(from)} to ${n(to)} min · absorbs ${n(capacity)}`,
  },
  lists: {
    back: 'Back to Your gear, changing nothing',
    titles: {
      hand: 'What you hold',
      helmet: 'Your helmet',
      chest: 'Your chest',
      legs: 'Your legs',
      cape: 'Your cape',
      trinket: 'Your trinket',
      power: 'Your power',
      drink: 'Your drink',
      moreDrink: 'One more drink',
      group: 'Group power',
      moreGroup: 'One more group power',
    },
    search: {
      hand: 'Search what you hold',
      helmet: 'Search a helmet',
      chest: 'Search a chest',
      legs: 'Search legs',
      cape: 'Search a cape',
      trinket: 'Search a trinket',
      power: 'Search a power',
      drink: 'Search a drink',
      moreDrink: 'Search a drink',
      group: 'Search a power',
      moreGroup: 'Search a power',
    },
    none: {
      helmet: 'No helmet',
      chest: 'No chest',
      legs: 'No legs',
      cape: 'No cape',
      trinket: 'No trinket',
      power: 'No power',
      drink: 'Remove this drink',
      group: 'Remove this power',
    },
    noneNote: {
      helmet: 'takes off the one you wear',
      chest: 'takes off the one you wear',
      legs: 'takes off the ones you wear',
      cape: 'takes off the one you wear',
      trinket: 'takes off the one you carry',
      power: 'takes off yours',
    },
    count: (count, category) => `${n(count)} ${category.toLocaleLowerCase('en')}`,
    countOf: (shown, all) => `${n(shown)} of ${n(all)}`,
    handNote: (skill, level) =>
      level === null
        ? `At level 1, with your Blocking skill ${n(skill)}; its level is set afterwards.`
        : `At level 1, with your Blocking skill ${n(skill)}; what you pick keeps your Lv${n(level)}, if it goes that high.`,
    pieceNote: (slot, level) =>
      level === null
        ? 'At level 1; its level is set afterwards.'
        : `At level 1; ${slot === 'legs' ? 'the ones you pick keep' : 'the one you pick keeps'} the level of your ${slot} (Lv${n(level)}), to set afterwards.`,
    oneAtATime: (carrying) =>
      carrying ? 'One at a time: the one you pick replaces yours.' : 'One at a time.',
    drinkOnce: (carried) =>
      carried.length === 0
        ? 'A drink is taken only once.'
        : `Your ${new Intl.ListFormat('en', { type: 'conjunction' }).format(carried)} ${carried.length === 1 ? 'is' : 'are'} already carried: a drink is taken only once.`,
    drinkSwap: (drink) => `Pick another to replace your ${drink}, or remove it.`,
    groupOnce: (own, group) => {
      const there = [...(own === null ? [] : [`${own} (yours)`]), ...group]
      return there.length === 0
        ? 'A power counts once.'
        : `Already there: ${new Intl.ListFormat('en', { type: 'conjunction' }).format(there)}. A power counts once.`
    },
    groupSwap: (power) => `Pick another to replace ${power}, or remove it.`,
  },
  effects: {
    kinds: { trinket: 'Trinket', power: 'Power', consumable: 'Drink' },
    groupPower: 'Group power',
    duration: (seconds) =>
      seconds >= 60 && seconds % 60 === 0 ? `${n(seconds / 60)} min` : `${n(seconds)} s`,
    fromAdrenaline: (duration, adrenaline) => `${duration} from ${n(adrenaline)} adrenaline`,
    tag: (kind, lasting) => `${kind} · ${lasting}`,
    firstLine: (lasting, change) => `${lasting} · ${change}`,
    armor: (value) => `armor +${n(value)}`,
    armorTimes: (multiplier) => `armor ×${n(multiplier)}`,
    parry: (multiplier) => `parry power ×${n(multiplier)}`,
    stagger: (multiplier) => `you stagger ${n(1 / multiplier)}× more slowly`,
    blockGivesBack: (stamina) => `blocking gives ${n(stamina)} stamina back`,
    blockStamina: (share) => `blocking costs ${staminaShare(share)}`,
    dodgeStamina: (share) => `dodging costs ${staminaShare(share)}`,
    noHit: 'changes no hit',
    card: 'With your temporary effects',
    group: 'Your temporary effects',
    noneOn: 'None on',
    on: (names) => new Intl.ListFormat('en', { type: 'conjunction' }).format(names),
    holds: 'Holds until you change creature.',
    idle: (reason) => `Changes nothing: ${reason}`,
    idleHere: 'Changes nothing here',
    idleNoHit: 'Changes no hit',
    notDealt: (types) =>
      `no ${new Intl.ListFormat('en', { type: 'disjunction' }).format(types.map((type) => type.toLocaleLowerCase('en')))}`,
    coveredBy: {
      helmet: 'already covered by your helmet',
      chest: 'already covered by your chest',
      legs: 'already covered by your legs',
      cape: 'already covered by your cape',
      set: 'already covered by your set',
      trinket: 'already covered by your trinket',
      power: 'already covered by your power',
      consumable: 'already covered by your drink',
    },
    coveredByPower: (power) => `already covered by ${power}`,
    coveredByWeather: (wet) => `already covered by ${wet}`,
    setupLine: (names) =>
      `Temporary effects on: ${new Intl.ListFormat('en', { type: 'conjunction' }).format(names)}`,
  },
  barrier: {
    lede: (staff, radius, from, to) =>
      `The ${staff} casts it on its caster and on the players within ${n(radius)} m, for ${n(from)} to ${n(to)} min by its level. You switch it on then on a creature's sheet or in the Simulation.`,
    skill: (skill) => `${skill} of its caster`,
    lower: (skill) => `Less ${skill}`,
    raise: (skill) => `More ${skill}`,
    absorbs: 'It absorbs',
    how: (base, perLevel, skill) =>
      `${n(base)}, plus ${n(perLevel)} per level of ${skill}. It counts the whole hit, chop and pickaxe included, and absorbs whole the one that breaks it.`,
    add: 'Add',
    remove: 'Remove the barrier',
    tag: (capacity, from, to) =>
      `From the group · absorbs ${n(capacity)} · ${n(from)} to ${n(to)} min`,
    hits: (hits, counted) =>
      `Barrier: ${plural(hits, 'hit', 'hits')}${counted === null ? '' : ` (counts ${n(counted)})`}`,
    takes: (name, hits, counted) =>
      `${name}: it takes ${plural(hits, 'hit', 'hits')} like this one (counts ${n(counted)}), then:`,
  },
  weather: {
    label: 'Weather',
    note: (_biome, name) =>
      `Counted for every creature of the ${name}, until you switch it off or change biome.`,
    beside: (biome, wet) => `${biome} · ${wet}`,
  },
  world: {
    summary: (difficulty, count) =>
      `Your world: ${difficulty.toLocaleLowerCase('en')} combat, ${players(count)}`,
    playersAndScale: (count, enemyScale) => `${players(count)} · ×${n(enemyScale)}`,
    title: 'Your world',
    difficulty: 'Combat difficulty',
    multiplier: (value) => `×${n(value)}`,
    difficultyNote: `The ${quoted('Combat')} setting of the world modifiers.`,
    players: (range) => `Players within ${n(range)} m, you included`,
    orMore: (count) => `${n(count)}+`,
    orMoreLabel: (count) => `${n(count)} or more`,
    effects: 'What it does',
    enemyHits: 'Monster hits',
    yourDamage: 'Your damage and stagger',
    yourDamageShort: 'Your damage',
    starChance: 'Star chance',
    sizeAndSpeed: 'Size and ground speed',
    rulesNote:
      'Size and speed: outside dungeons. The rules (parry window, thresholds) and the pace of attacks stay the same.',
  },
  verdicts: {
    block: 'Block',
    parry: 'Parry',
    dodge: 'Dodge',
    holds: 'holds',
    staggered: 'you stagger',
    broken: 'breaks',
    unblockable: 'unblockable',
    cannotParry: "can't parry",
    nothing: 'no direct attack',
    dodgeable: 'dodgeable',
    undodgeable: 'undodgeable',
    pill: (guard, word) => `${guard}: ${word}`,
  },
  advice: {
    unknown: 'No direct attack',
    blockAll: 'You block everything without staggering',
    parryAll: (block) =>
      `Parry it: ${block === 'broken' ? 'the block gives way' : 'blocking staggers you'}`,
    dodgeAll: (rolls, canParry) =>
      `${rolls ? 'Dodge' : 'Avoid'} everything: even ${canParry ? 'parried' : 'blocked'}, its attacks get through`,
    dodgeSome: (rolls, attacks, rest) =>
      `${rolls ? 'Dodge' : 'Avoid'} ${attacks.length === 1 ? quoted(attacks[0]!) : `${n(attacks.length)} attacks`}, ${rest} the rest`,
  },
  bestiary: {
    intro: 'How to take each creature with your gear.',
    search: 'Search every biome',
    searchPlaceholder: 'Creature or attack, every biome',
    clearSearch: 'Clear the search',
    biome: 'Biome',
    previousBiome: (name) => `Previous biome: ${name}`,
    nextBiome: (name) => `Next biome: ${name}`,
    biomeCount: (index, total, count) =>
      `Biome ${n(index)} of ${n(total)} · ${plural(count, 'creature', 'creatures')}`,
    howToTake: 'How to take it',
    withoutEffects: 'Without your temporary effects',
    creatures: 'Creatures of the biome',
    health: (health) => `${n(health)} HP`,
    boss: 'Boss',
    foundCreatures: (count) => `Creatures · ${n(count)}`,
    foundAttacks: (count) => `Attacks · ${n(count)}`,
    nothingFound: (query) => `Nothing for ${quoted(query)}`,
    searchNote:
      "Results from every biome. An attack opens its creature's sheet, where you can simulate it.",
  },
  creature: {
    back: 'Back',
    stars: 'Stars',
    star: (stars) => `${n(stars)}★`,
    health: 'Health',
    healthShort: 'HP',
    toInflict: 'To stagger',
    neverStaggers: 'Never staggers',
    yourParry: 'Your parry',
    parryStaggers: 'Staggers it',
    parryDoesNot: "Doesn't stagger it",
    cannotParry: "Your item can't parry",
    modifiers: 'Weaknesses and resistances',
    modifiersOn: (part) => `Weaknesses and resistances · ${part}`,
    body: 'Body',
    modifier: (type, state, multiplier) =>
      state === null ? `${type} ×${n(multiplier)}` : `${type} · ${state} ×${n(multiplier)}`,
    everythingElse: 'Everything else ×1',
    noModifier: 'Everything ×1',
    attacks: 'Its attacks',
    attack: 'Attack',
    damage: 'Damage',
    damageShort: 'Dmg',
    range: 'Range',
    simulate: 'Simulate',
    kinds: { melee: 'Melee', area: 'Area', projectile: 'Projectile', summon: 'Summon' },
    metres: (metres) => `${n(metres)} m`,
    phase: (index, health) => `Phase ${n(index)} · ${n(health)} HP`,
    noAttack: 'No attack',
    trample: 'Trample',
    whenRunning: 'When running',
    deathBlast: 'Explosion',
    onDeath: (phase) => (phase ? 'End of the phase' : 'On its death'),
    count: (min, max) => (min === max ? `×${n(min)}` : `×${n(min)}–${n(max)}`),
    seeSheet: 'See its sheet',
    sheet: 'Its sheet',
    attackSummary: ({ name, types, damage, block, parry, dodgeable }) =>
      damage === null
        ? `${name}, summon.`
        : `${name}, ${listOf(types)}, ${n(damage)} damage. Block: ${block}. Parry: ${parry}. ${dodgeable ? 'Dodgeable' : 'Undodgeable'}.`,
    openSimulation: 'Open the simulation.',
    openSheet: (creature) => `Open the ${creature} sheet.`,
    simulateLabel: (name, damage) => `Simulate: ${name}, ${n(damage)} damage`,
    tapToSimulate: 'Tap an attack to simulate it.',
    desktopNote:
      'Simulate opens the attack in the Simulation, with the stagger bar and the stamina.',
  },
  simulation: {
    intro: 'Pick an attack: the page tells you how to take it with your gear.',
    source: 'Source of the hit',
    modes: { attack: 'Monster attack', value: 'Free value' },
    hit: 'The hit',
    change: 'Change',
    changeLabel: (creature, attack, damage) =>
      `Change the attack: ${creature}, ${attack}, ${n(damage)} damage`,
    noAttack: 'No attack picked',
    pick: 'Pick an attack',
    stars: "Monster's stars",
    starsShort: 'Stars',
    value: 'Damage of the hit',
    lower: 'Lower by 5',
    raise: 'Raise by 5',
    valueNote: 'Base damage of the hit, before difficulty and nearby players.',
    bar: 'Stagger bar before the hit',
    barOption: (percent) => `${n(percent)}%`,
    result: 'Result',
    blocking: 'Blocking',
    parrying: 'Parrying',
    taken: 'taken',
    stamina: (stamina) =>
      stamina > 0
        ? `−${n(stamina)} stamina`
        : stamina < 0
          ? `+${n(-stamina)} stamina`
          : '0 stamina',
    barTotal: (total, limit) => `bar: ${n(total)} / ${n(limit)}`,
    barOverflows: 'bar: overflows',
    barLabel: (total, limit, overflows) =>
      `Stagger bar: ${n(total)} of ${n(limit)}${overflows ? ', it overflows' : ''}`,
    barRangeLabel: (low, top, limit, overflows) =>
      overflows
        ? `Stagger bar: ${n(low)} of ${n(limit)} at the lowest, it may overflow`
        : `Stagger bar: ${range(low, top)} of ${n(limit)}`,
    details: {
      title: 'Details',
      rolled: (lowest) => `Every hit varies from ${n(lowest)} to 100%`,
      unrolled: 'This hit does not vary',
      range: (low, top) => range(low, top),
      odds: (guard, top, times, of, low) =>
        `${outcome(guard, top)} ${plural(times, 'time', 'times')} in ${n(of)}, else ${outcome(guard, low)}`,
      overTime: (type, low, top) =>
        `then ${low.damage === 0 ? `up to ${n(top.damage)}` : range(low.damage, top.damage)} ${type.toLocaleLowerCase('en')} over ${low.seconds === 0 ? n(top.seconds) : range(low.seconds, top.seconds)} s`,
      fizzled: (type, kind) =>
        kind === 'spirit'
          ? `too little ${type.toLocaleLowerCase('en')} damage gets through`
          : `too little ${type.toLocaleLowerCase('en')} gets through to ${kind === 'burning' ? 'burn' : 'poison'}`,
      bar: (low, top, limit) => `bar ${range(low, top)} / ${n(limit)}`,
    },
    dodgeable: 'Dodgeable by rolling',
    undodgeable: 'Not dodgeable by rolling',
    hits: (count) => `This attack lands ${n(count)} hits: each card shows the hardest.`,
    thresholds: 'Your thresholds are in Your gear',
    advice: {
      block: 'Block it: you hold without staggering',
      parry: (block) =>
        `Parry it: ${block === 'broken' ? 'the block gives way' : 'blocking staggers you'}`,
      dodge: (dodgeable, guard, setback) => {
        if (setback === 'unblockable') {
          if (dodgeable === null) return 'Unblockable: dodge if you can'
          return dodgeable ? 'Unblockable: dodge it' : 'Unblockable: keep away'
        }
        const why =
          guard === 'parry'
            ? setback === 'broken'
              ? 'even the parry gives way'
              : 'even parried, you stagger'
            : setback === 'broken'
              ? 'the block gives way'
              : 'blocking staggers you'
        if (dodgeable === null) return `${capitalised(why)}: dodge if you can`
        return `${dodgeable ? 'Dodge' : 'Avoid'} it: ${why}`
      },
    },
  },
  picker: {
    title: 'Pick an attack',
    close: 'Close',
    search: 'Search an enemy or an attack',
    searchPlaceholder: 'Enemy or attack, every biome',
    recent: 'Recent',
    enemies: 'Enemies',
    biomeCount: (index, total) => `Biome ${n(index)} of ${n(total)}`,
    attackCount: (count) => plural(count, 'attack', 'attacks'),
    enemiesNote: 'Tap an enemy to see its attacks, then the attack to simulate.',
    attacksNote:
      'Click an attack to open it in the Simulation. Damage at the lowest stars: the stars are set there.',
    foundAttacks: (count) => `Attacks · ${n(count)}`,
    foundEnemies: (count) => `Enemies · ${n(count)}`,
    noAttack: (query) => `No attack matches ${quoted(query)}.`,
    noEnemy: (query) => `No enemy matches ${quoted(query)}.`,
    openNote: 'Tapping an attack opens it straight in the Simulation.',
    resultsNote: 'Results from every biome.',
  },
  arsenal: {
    families: { hand: 'In hand', armor: 'Armor pieces', carry: 'What you carry' },
    familiesShort: { hand: 'In hand', armor: 'Armor', carry: 'To carry' },
    family: 'Family',
    category: 'Category',
    nav: 'Arsenal categories',
    categories: {
      shields: 'Shields',
      weapons: 'Weapons',
      others: 'Others',
      helmets: 'Helmets',
      chests: 'Chests',
      legs: 'Legs',
      capes: 'Capes',
      powers: 'Powers',
      trinkets: 'Trinkets',
      drinks: 'Drinks',
    },
    item: {
      shields: 'Shield',
      weapons: 'Weapon',
      others: 'Item',
      helmets: 'Helmet',
      chests: 'Chest',
      legs: 'Legs',
      capes: 'Cape',
      powers: 'Power',
      trinkets: 'Trinket',
      drinks: 'Drink',
    },
    atLevelOne: 'At level 1, with your Blocking skill',
    pickLevel: {
      hand: '; pick one to choose its level in Your gear.',
      armor: 'At level 1; pick one to choose its level in Your gear.',
    },
    carryLede:
      'Read from the game: the powers, and the trinkets and drinks that change a fight. Carrying it adds it to Your gear; you switch it on in a creature’s sheet or in the Simulation.',
    powersLede:
      'Read from the game: the powers, and the trinkets and drinks that change a fight. Equipping a power makes it yours in Your gear; you switch it on in a creature’s sheet or in the Simulation.',
    sort: 'Sort by',
    columns: {
      type: 'Type',
      power: 'Block',
      parry: 'Parrying',
      armor: 'Armor',
      perLevel: 'Per level',
      resistances: 'Resistances and weaknesses',
      set: 'Set',
      duration: 'Duration',
      cooldown: 'Cooldown',
      trigger: 'Starts',
      action: 'Action',
    },
    changes: { powers: 'What it changes', trinkets: 'What it changes', drinks: 'What it changes' },
    perLevel: (armor) => (armor > 0 ? `+${n(armor)}` : '—'),
    cooldown: (duration) => `cooldown ${duration}`,
    trigger: (adrenaline) => `from ${n(adrenaline)} adrenaline`,
    setLine: (set, size, changes) => `${set} set, ${n(size)} pieces: ${changes}`,
    setSize: (size) => `${n(size)} pieces`,
    equipped: 'Equipped',
    carried: 'Carried',
    group: 'Group',
    equip: 'Equip',
    carry: 'Carry',
    equipLabel: (item) => `Equip: ${item}`,
    carryLabel: (item) => `Carry: ${item}`,
    choose: 'Choose',
    chooseLabel: (item) => `Choose: ${item}`,
    takeOff: 'Take off',
    pickLabel: (item, state) => `${item}${state === null ? '' : rowState[state]}. Choose.`,
    rowLabel: (item, state) =>
      `${item}${state === null ? '' : rowState[state]}. Open in Your gear.`,
    search: 'Search the whole Arsenal',
    searchPlaceholder: 'Item, piece or effect, everywhere',
    searchPlaceholderShort: 'Search everywhere',
    clearSearch: 'Clear the search',
    found: (results, categories) =>
      `${plural(results, 'result', 'results')} in ${plural(categories, 'category', 'categories')}`,
    foundFor: (results, query, categories) =>
      `${plural(results, 'result', 'results')} for ${quoted(query)}, in ${plural(categories, 'category', 'categories')}.`,
    seeAll: (count, category) => `See the ${n(count)} ${category.toLocaleLowerCase('en')}`,
    nothingFound: (query) => `Nothing for ${quoted(query)}`,
  },
  guide: {
    intro: (version) => `The rules of combat, read in Valheim ${version}.`,
    search: 'Search the guide',
    searchPlaceholder: 'Search a rule',
    clearSearch: 'Clear the search',
    rules: 'Rules',
    contents: 'Guide contents',
    noMatch: (query) => `No rule matches ${quoted(query)}.`,
  },
  modal: { close: 'Close without saving', cancel: 'Cancel', save: 'Save' },
  report: {
    fromCreature: 'Wrong number or name? Report it',
    fromVerdict: 'Does this verdict look wrong? Report it',
    fromSettings: 'Report a problem or an idea',
    title: 'Report',
    close: 'Close',
    kinds: 'What you report',
    kind: { data: 'Wrong data', bug: 'Bug', idea: 'Idea' },
    whichLine: 'Which line?',
    optional: 'optional',
    weaknesses: 'Weaknesses',
    message: 'Your message',
    text: { data: 'What is wrong?', bug: 'What happened?', idea: 'Your idea' },
    textHint: {
      data: 'In the game it deals 60, not 70.',
      bug: 'The sheet stays empty when I change stars.',
      idea: "See the bosses' attacks phase by phase.",
    },
    game: 'What the game shows',
    gameHint: '60, or another name',
    nickname: 'Your name, to thank you',
    nicknameHint: 'Your name',
    attached: 'Attached to the report',
    attachedSummary: 'Version, data, what the screen shows, your setup',
    device: (version, gameVersion) => `${APP_NAME} ${version} · read from Valheim ${gameVersion}`,
    screen: (language, screen, width) =>
      [
        { fr: 'French', en: 'English' }[language],
        ...(screen === 'app'
          ? []
          : [
              {
                creature: 'creature sheet',
                simulation: 'Simulation',
                settings: 'Settings',
                bestiary: 'Bestiary',
                arsenal: 'Arsenal',
                guide: 'Guide',
              }[screen],
            ]),
        `${n(width)} px screen`,
      ].join(' · '),
    crashText: 'What you were doing',
    crashHint: {
      creature: 'I set the Troll to 2★.',
      bestiary: 'I switched biome.',
      simulation: 'I picked an attack.',
      arsenal: 'I changed the level.',
      guide: 'I opened a rule.',
      app: `I opened ${APP_NAME}.`,
    },
    crashSummary: 'Version, screen, the error and its stack',
    moreLines: (count) => `… ${plural(count, 'more line', 'more lines')}`,
    nothingElse: 'Nothing else: no IP address, no identifier.',
    public: 'Your report becomes public on GitHub, with your name if you give one.',
    send: 'Send',
    sending: 'Sending…',
    cancel: 'Cancel',
    received: "Received, it's",
    receivedNote: "It's public on GitHub. Thank you: every fix helps every player.",
    view: 'View on GitHub',
    queued: 'Kept on your device',
    queuedNote: `It could not leave yet. It will on its own once the network is back, or the next time you open ${APP_NAME}.`,
    refused: 'Refused by the server',
    refusedNote:
      "It won't go through as it is. Write it on GitHub instead, where each form guides you.",
    onGitHub: 'Open an issue on GitHub',
    done: 'Close',
  },
  crash: {
    sheetTitle: 'This sheet crashed',
    sheetNote: `The rest of ${APP_NAME} works: pick another creature, or go to the Simulation.`,
    retry: 'Try again',
    appTitle: `${APP_NAME} crashed`,
    appNote: 'Your settings, your gear and your world stay on this device: reload to carry on.',
    reload: 'Reload',
    send: 'Send the report',
    trust: 'Nothing leaves without you: the report is sent only if you ask.',
    screens: {
      bestiary: {
        title: 'The Bestiary crashed',
        note: `The rest of ${APP_NAME} works: go to the Simulation, the Arsenal or the Guide.`,
      },
      simulation: {
        title: 'The Simulation crashed',
        note: `The rest of ${APP_NAME} works: go to the Bestiary, the Arsenal or the Guide.`,
      },
      arsenal: {
        title: 'The Arsenal crashed',
        note: `The rest of ${APP_NAME} works: go to the Bestiary, the Simulation or the Guide.`,
      },
      guide: {
        title: 'The Guide crashed',
        note: `The rest of ${APP_NAME} works: go to the Bestiary, the Simulation or the Arsenal.`,
      },
    },
    row: 'This row crashed',
    report: 'Report',
  },
  loop: {
    feedback: 'Your feedback',
    reports: 'My reports',
    reportsSummary: (sent, fixed) => `${n(sent)} sent · ${n(fixed)} fixed`,
    noReports: 'No report sent from this device yet.',
    reportsNote:
      'Sent from this device. Their state comes from GitHub when you are online; open one to see it.',
    columns: { subject: 'Subject', number: 'No.', date: 'Date', state: 'State' },
    states: {
      waiting: 'Waiting to be sent',
      sent: 'Sent',
      open: 'Open',
      fixedIn: (version) => `Fixed in ${version}`,
      fixedNext: 'Fixed, in the next version',
      duplicate: 'Closed · already reported',
      declined: 'Closed · not planned',
    },
    news: "What's new",
    noteKinds: { new: 'New', improved: 'Improved', fixed: 'Fixed' },
    newsSummary: (version, date) => `${version} · ${date}`,
    thanks: (names) => `Thanks ${new Intl.ListFormat('en', { type: 'conjunction' }).format(names)}`,
    yours: (numbers) =>
      `${numbers.length > 1 ? 'your reports' : 'your report'} ${numbers.map((number) => `#${String(number)}`).join(', ')}`,
    back: 'Back to Settings',
    close: 'Close',
    thanksTitle: 'Fixed thanks to you',
    thanksBody: (count, version, nickname) =>
      `${count > 1 ? 'Your reports are fixed' : 'Your report is fixed'} in ${version}. Thank you${nickname ? `, ${nickname}` : ''}: every fix helps every player.`,
    seeNews: "See what's new",
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    automatic: 'Automatic',
    languageNote: (detected) =>
      `Automatic follows your device (${detected === 'fr' ? 'French' : 'English'} detected), otherwise English. Game names follow the chosen language.`,
    theme: 'Theme',
    byDefault: 'Default',
    themeNote: 'Saved on this device. The preview changes as soon as you tap a choice.',
    themeNoteDesktop: 'The preview changes as soon as you choose.',
    about: 'About',
    dataSource: (version) => `Read from Valheim ${version} · no mods`,
    source: 'Source code and licence',
    licence: (copyright) => `${copyright} · free software under the GPLv3, no warranty.`,
    themes: {
      origine: { name: 'Origin', description: 'Cold black, glacier blue accent' },
      braise: { name: 'Ember', description: 'Warm charcoal, bone accent' },
      brume: { name: 'Mist', description: 'Violet night, lilac accent' },
      jour: { name: 'Daylight', description: 'Light, readable in full sun' },
      runes: { name: 'Runes', description: 'Dark stone, turquoise rune' },
      graphite: { name: 'Graphite', description: 'Neutral greys, understated' },
      parchemin: { name: 'Parchment', description: 'Warm light, blue ink' },
    },
  },
  notices: {
    title: 'Notices and credits',
    rowMeta: 'Fan project, credits, your data',
    fan: 'Fan project',
    fanText: `${APP_NAME} is an unofficial fan project, not made or endorsed by Iron Gate or Coffee Stain. Valheim, and the names and data read from the game, belong to Iron Gate.`,
    credits: 'Credits',
    wikiText:
      'Attack names: partly from the {wiki}, written by its contributors, under {licence}. Most of the French names translate them.',
    wiki: 'Valheim wiki',
    fonts:
      'Fonts: IBM Plex Sans and IBM Plex Mono, © IBM Corp., under the SIL Open Font License 1.1.',
    libraries: 'Libraries: React, © Meta Platforms, and Workbox, © Google, under the MIT licence.',
    licenceTexts: 'Full licence texts',
    data: 'Your data',
    device:
      'Your settings, your gear and the list of your reports stay on this device. No account, no cookies, no analytics.',
    reports:
      "A report becomes a public issue on GitHub, sent through Vercel: your words, your nickname if you give one, and what the app attaches. Your nickname may also appear in What's new, to thank you.",
    network:
      "To follow your reports, the app asks GitHub for their state. As with any site, Vercel, which serves the app, and GitHub see your connection's IP address; it is never attached to a report.",
    removal: 'To have a report or your nickname removed, write to {email}.',
    legal: 'Legal notice',
    publisher: `Publisher: ${PUBLISHER}, as a private individual.`,
    host: 'Host: Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA.',
  },
  arrival: {
    listKicker: 'Question 2 · Your gear',
    step: (index, count) => `${n(index)} of ${n(count)}`,
    skip: 'Skip',
    next: 'Next',
    previous: 'Back',
    previousLabel: 'Previous question',
    where: 'Where are you?',
    whereLead: 'The biome you fight in right now.',
    gearLead: 'What your left hand holds, and your defensive stats.',
    worldLead: `Your world's ${quoted('Combat')} setting, and who plays along.`,
    see: (_biome, name) => `See the ${name}`,
  },
  install: {
    title: `Install ${APP_NAME}`,
    lead: 'To keep it at hand, next to the game.',
    perks: {
      phone: ['An icon on your home screen', 'Full screen, no address bar', 'Works offline'],
      desktop: [
        'An icon beside your other apps',
        'Its own window, no address bar',
        'Works offline',
      ],
    },
    inSafari: 'In Safari',
    steps: {
      'ios-menu': [
        `Tap {more} next to the address, then ${quoted('Share')}.`,
        `Choose ${quoted('Add to Home Screen')}, then ${quoted('Add')}.`,
        `Open ${APP_NAME} from your home screen.`,
      ],
      'ios-bar': [
        `Tap {share} ${quoted('Share')} in Safari's bar.`,
        `Choose ${quoted('Add to Home Screen')}, then ${quoted('Add')}.`,
        `Open ${APP_NAME} from your home screen.`,
      ],
      mac: [
        `In the menu bar, choose File › ${quoted('Add to Dock')}.`,
        `Open ${APP_NAME} from the Dock.`,
      ],
    },
    first: "Do it before setting anything: the installed app doesn't get what you set in Safari.",
    later:
      "The installed app starts from scratch: Safari doesn't pass it your settings, you set them there once.",
    install: 'Install',
    continueInBrowser: 'Continue in the browser',
    continueInSafari: 'Continue in Safari',
    inSettings: "You'll find it in Settings › About.",
    row: `Install ${APP_NAME}`,
    rowMeta: 'On your home screen, offline',
    close: 'Close',
  },
}
