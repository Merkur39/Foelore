// Writes the « PV et ton monde · pistes » boards (#84) from out/data.json: three tracks for how a creature's health
// reads beside « À infliger », which already counts what the world leaves of your hits. Static boards, phones only:
// the Black Forest's list and the Troll's sheet on Hard with 3 players, the sheet again on Very easy alone; the
// figures from the app's engine (data.mts).
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs, then node add.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const data = JSON.parse(readFileSync(new URL('./out/data.json', import.meta.url), 'utf8'))
const OUT = new URL('../../canvas/project/', import.meta.url)

const C = {
  bg: '#0D1214', surface: '#151C1F', selection: '#1D3344', line: '#2C383D', lineSoft: '#1F2A2E', ink: '#E2E8E8',
  secondary: '#97A5AA', faint: '#7D8B91', accent: '#8EBDE3',
  ok: '#6CC08A', okFill: '#2E7A4B', warn: '#D9A043', warnFill: '#B5760C', bad: '#E36B5E', badFill: '#7A2A24',
}
const MONO = "font-family: 'IBM Plex Mono', monospace"
const TONE = { holds: 'ok', staggered: 'warn', broken: 'bad', unblockable: 'bad' }
const fmt = (x) => (Math.round(x * 100) / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })
const int = (x) => x.toLocaleString('fr-FR')
const ICON = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
const svg = (paths, size, { color = 'currentColor', width = 2, style = '' } = {}) =>
  `<svg ${ICON.replace('stroke="currentColor"', `stroke="${color}"`)} stroke-width="${width}" width="${size}" height="${size}"${style ? ` style="${style}"` : ''}>${paths}</svg>`

const CHEVRON = (size, color) => svg('<path d="M9 6l6 6-6 6"></path>', size, { color, width: 1.75, style: 'flex: none' })
const BACK = svg('<path d="M19 12H5M11 6l-6 6 6 6"></path>', 22, { width: 1.75 })
const SHIELD = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path>'
const PARRY = SHIELD + '<path d="M13 7.5l-3 4.5h4l-3 4.5"></path>'
const DODGE = '<path d="M4 16a8 8 0 0 1 14.5-6.5"></path><path d="M19 4.5v5h-5"></path><path d="M3 20h8"></path>'
const GLOBE = '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"></path>'
const SETTINGS = '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"></path><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="17" cy="18" r="2"></circle>'
const ADVICE_ICON = {
  ok: '<path d="M5 12l5 5L20 7"></path>',
  warn: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
  bad: '<path d="M6 6l12 12M18 6L6 18"></path>',
}
// The canvas's words and icons for the damage types (scripts/damage_types.py).
const TYPES = {
  blunt: ['CONTONDANT', 'M13 3l8 8-4 4-8-8zM13 11l-9 9'],
  slash: ['COUPANT', 'M4 14L14 4M7 19L19 7M13 20l7-7'],
  pierce: ['PERFORANT', 'M20 4l-7 3 4 4zM15 9L4 20'],
  fire: ['FEU', 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z'],
  frost: ['GLACE', 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9'],
  lightning: ['FOUDRE', 'M13 3L5 14h6l-1 7 8-11h-6l1-7z'],
  poison: ['POISON', 'M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z'],
  spirit: ['ESPRIT', 'M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 11h.01M14 11h.01'],
}
const typeIcon = (type, size = 12, margin = '0 5px 0 0') => svg(`<path d="${TYPES[type][1]}"></path>`, size, { style: `vertical-align: -2px; margin: ${margin}` })
const KINDS = { melee: 'MÊLÉE', area: 'ZONE', projectile: 'PROJECTILE' }
const STATES = {
  veryWeak: ['TRÈS FAIBLE', 2], weak: ['FAIBLE', 1.5], slightlyWeak: ['UN PEU FAIBLE', 1.25],
  slightlyResistant: ['UN PEU RÉSISTANT', 0.75], resistant: ['RÉSISTANT', 0.5], veryResistant: ['TRÈS RÉSISTANT', 0.25], immune: ['IMMUNISÉ', 0],
}
const ORDER = ['veryWeak', 'weak', 'slightlyWeak', 'slightlyResistant', 'resistant', 'veryResistant', 'immune']

// ——— The creature's sheet ——————————————————————————————————————————————————————————————————————————————————————

const chip = (type, state) => {
  const [word, multiplier] = STATES[state]
  const weak = multiplier > 1
  const immune = multiplier === 0
  return `<span style="padding: 3px 8px; border-radius: 3px; border: 1px ${immune ? 'dashed' : 'solid'} ${weak ? C.secondary : C.line}; color: ${weak ? C.ink : immune ? C.faint : C.secondary}">${typeIcon(type)}${TYPES[type][0]} · <span style="font-weight: 500">${word} ×${fmt(multiplier)}</span></span>`
}
const resistances = (modifiers) => {
  const chips = Object.entries(modifiers).filter(([type, state]) => TYPES[type] && STATES[state]).sort((a, b) => ORDER.indexOf(a[1]) - ORDER.indexOf(b[1]))
  return `<div style="flex: none; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">FAIBLESSES ET RÉSISTANCES</span>` +
    `<div style="display: flex; gap: 6px 8px; flex-wrap: wrap; align-items: center; ${MONO}; font-size: 12px">${chips.map(([type, state]) => chip(type, state)).join('')}<span style="font-size: 11px; color: ${C.faint}">${chips.length ? 'Tout le reste ×1' : 'Tout ×1'}</span></div></div>`
}
const verdictBox = (verdict, paths) => {
  const tone = TONE[verdict] ?? 'ok'
  return `<span style="width: 28px; height: 28px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${C[`${tone}Fill`]}; color: ${C[tone]}">${svg(paths, 15)}</span>`
}
const headIcon = (paths, label) => `<span style="width: 28px; display: flex; justify-content: center"><svg ${ICON} stroke-width="2" width="13" height="13" aria-label="${label}">${paths}</svg></span>`
const tagLine = (a) => a.types.map((type, i) => typeIcon(type, 12, i === 0 ? '0 3px 0 0' : '0 3px 0 6px') + TYPES[type][0]).join('') + ` · ${KINDS[a.kind]}`
function attacks(sheet) {
  const grid = 'display: grid; grid-template-columns: minmax(0, 1fr) 40px 96px 16px; gap: 8px; align-items: center'
  return `<section style="flex: none; display: flex; flex-direction: column"><div style="${grid}; padding-bottom: 6px; border-bottom: 1px solid ${C.line}; font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}"><h2 style="margin: 0; font-size: 10px; font-weight: 400">SES ATTAQUES</h2><span style="text-align: right">DÉG.</span><span style="display: flex; gap: 4px">${headIcon(SHIELD, 'Blocage')}${headIcon(PARRY, 'Parade')}${headIcon(DODGE, 'Esquive')}</span><span></span></div>` +
    sheet.attacks.map((a) => `<div style="${grid}; min-height: 56px; padding: 6px 0; box-sizing: border-box; border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 14px">${a.name}</span><span style="${MONO}; font-size: 10px; color: ${C.secondary}; white-space: nowrap">${tagLine(a)}</span></span><span style="text-align: right; ${MONO}; font-size: 15px">${a.damage}</span><span aria-hidden="true" style="display: flex; gap: 4px">${verdictBox(a.block, SHIELD)}${verdictBox(a.parry, PARRY)}${verdictBox(a.dodgeable ? 'holds' : 'broken', DODGE)}</span>${CHEVRON(16, C.faint)}</div>`).join('') +
    `</section>`
}
// A cell of the stats; `under` a small line below a number (track B).
const stat = (label, value, { tone, under } = {}) =>
  `<div style="background: ${C.surface}; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>` +
  (tone ? `<span style="font-size: 13px; color: ${tone === 'none' ? C.secondary : C[tone]}; padding-top: 3px">${value}</span>` : `<span style="${MONO}; font-size: 18px">${value}</span>`) +
  (under ? `<span style="${MONO}; font-size: 10px; line-height: 13px; letter-spacing: 0.04em; color: ${C.faint}">${under}</span>` : '') +
  `</div>`
const adviceLine = (advice) =>
  `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${C[advice.tone]}">${svg(ADVICE_ICON[advice.tone], 16, { width: 2.25, style: 'flex: none' })}<span>${advice.text}</span></div>`
const CARD =
  `<div style="flex: none; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.surface}"><div style="display: flex; align-items: center; gap: 12px; min-height: 56px; box-sizing: border-box; padding: 8px 12px"><span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; line-height: 20px">Avec tes effets temporaires</span><span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">Aucun allumé</span></span>${svg('<path d="M6 9l6 6 6-6"></path>', 18, { color: C.secondary, style: 'flex: none' })}</div></div>`
/** A creature's sheet: `health` the PV cell's options, `note` a line under the stats (track C). */
function sheetPhone(sheet, { health, note = '' }) {
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${BACK}</span><h1 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">${sheet.name}</h1><span style="${MONO}; font-size: 11px; color: ${C.secondary}">FORÊT NOIRE</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 4px 16px 12px; overflow: hidden"><div style="display: flex; flex-direction: column; gap: 14px">` +
    `<div style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: ${C.line}; border: 1px solid ${C.line}; border-radius: 6px; overflow: hidden">${stat('PV', health.value, health)}${stat('À INFLIGER', int(sheet.toInflict))}${stat('TA PARADE', sheet.parryStaggers ? 'Le fait tituber' : 'Ne le fait pas tituber', { tone: sheet.parryStaggers ? 'ok' : 'none' })}</div>` +
    note + adviceLine(sheet.advice) + CARD + resistances(sheet.modifiers) + attacks(sheet) + `</div></main></div>`
}

// ——— The Bestiary's list ———————————————————————————————————————————————————————————————————————————————————————

const pill = (verdict, paths) => {
  const tone = verdict === null ? null : TONE[verdict]
  return `<span style="width: 30px; height: 30px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${tone ? C[`${tone}Fill`] : C.line}; color: ${tone ? C[tone] : C.faint}">${svg(paths, 16)}</span>`
}
const contextButton = (world) =>
  `<span style="height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; ${MONO}; font-size: 12px"><span style="display: flex; align-items: center; gap: 4px">${svg(SHIELD, 15, { color: C.accent })}VD ${data.blockPower}</span><span style="display: flex; align-items: center; gap: 4px">${svg(GLOBE, 15, { color: C.accent })}×${fmt(world.enemy)}</span>${svg('<path d="M6 9l6 6 6-6"></path>', 16, { color: C.secondary })}</span>`
/** The Black Forest's list; `health(c)` what a row says of a creature's health. */
function bestiaryPhone(world, health) {
  const items = world.blackForest.map((c) => {
    const dodge = c.dodgeable === null ? null : c.dodgeable ? 'holds' : 'broken'
    return `<li style="border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; justify-content: center; gap: 4px; min-height: 64px; padding: 6px 0"><span style="display: flex; align-items: center; gap: 12px"><span style="flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 15px">${c.name}${c.qualifier ? `<span style="color: ${C.secondary}"> · ${c.qualifier}</span>` : ''}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${health(c)}</span></span><span style="display: flex; gap: 6px">${pill(c.block, SHIELD)}${pill(c.parry, PARRY)}${pill(dodge, DODGE)}</span></span>` +
      `<span style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: ${C[c.advice.tone]}">${svg(ADVICE_ICON[c.advice.tone], 14, { width: 2.25, style: 'flex: none' })}<span>${c.advice.text}</span></span></span></li>`
  }).join('')
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; position: relative; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px"><span style="flex: 1; display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 500">${svg(SHIELD, 20, { color: C.accent, width: 1.75 })}Foelore</span>${contextButton(world)}<span style="width: 44px; height: 44px; margin-right: -10px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${svg(SETTINGS, 22, { width: 1.75 })}</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 12px">` +
    `<span style="flex: none; display: flex; align-items: center; gap: 8px; height: 44px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; padding: 0 12px; font-size: 15px; color: ${C.faint}">${svg('<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>', 18, { color: C.faint, width: 1.75 })}Monstre ou attaque, tous biomes</span>` +
    `<div style="flex: none; display: flex; align-items: center; background: ${C.surface}; border-radius: 6px"><span style="width: 48px; height: 52px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${svg('<path d="M15 6l-6 6 6 6"></path>', 20, { width: 1.75 })}</span><div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px"><span style="font-size: 16px; font-weight: 500">Forêt noire</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">BIOME 2 SUR 8 · ${world.blackForest.length} CRÉATURES</span></div><span style="width: 48px; height: 52px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${CHEVRON(20, C.secondary)}</span></div>` +
    `<div style="flex: 1; min-height: 0; display: flex; flex-direction: column"><div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid ${C.line}"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">COMMENT LE PRENDRE</span><span style="${MONO}; font-size: 11px; color: ${C.faint}">SANS TES EFFETS TEMPORAIRES</span></div>` +
    `<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden">${items}</ul></div></main>` +
    `<nav style="flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid ${C.line}; padding: 6px 0 14px">${['Bestiaire', 'Simulation', 'Arsenal', 'Mémo'].map((n) => `<span style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; font-size: 11px; color: ${n === 'Bestiaire' ? C.accent : C.faint}">${n}</span>`).join('')}</nav>` +
    `</div>`
}

// ——— Boards ————————————————————————————————————————————————————————————————————————————————————————————————————

const HARD = data.worlds.hard3
const EASY = data.worlds.veryEasy1
const SCENE_LINE = `Troll et Forêt noire, équipement des maquettes (Bouclier en argent N3, Blocage 25, pièces en fer N1 et cape de loup N3, 150 PV), rien d'allumé. Difficile à 3 joueurs : tes coups ×${fmt(HARD.you)} (0,85 ÷ 1,6), ceux des monstres ×${fmt(HARD.enemy)}. Très facile seul : ×${fmt(EASY.you)} et ×${fmt(EASY.enemy)}. En Normal seul, les trois pistes montrent la fiche d'aujourd'hui. Chiffres du moteur de l'app. Les têtes de phase d'un boss (« Phase 1 · … PV ») et le rapport d'un joueur suivent la piste retenue.`
function board(title, heading, desc, proscons, phones) {
  const cols = phones.map(([label, html, caption]) => `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span><div style="border-radius: 2px; overflow: hidden">${html}</div>${caption ? `<span style="font-size: 12px; line-height: 1.45; color: ${C.faint}">${caption}</span>` : ''}</div>`).join('')
  const width = 40 * 2 + 390 * phones.length + 32 * (phones.length - 1)
  const html = `<div style="width: ${width}px; height: 1300px; box-sizing: border-box; padding: 40px; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 28px"><header style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">${heading}</h1><p style="margin: 0; max-width: 1200px; font-size: 15px; line-height: 1.5; color: ${C.secondary}">${desc}</p>${proscons ? `<p style="margin: 0; max-width: 1200px; font-size: 13px; line-height: 1.5; color: ${C.faint}">${proscons}</p>` : ''}<p style="margin: 0; max-width: 1200px; font-size: 12px; line-height: 1.5; color: ${C.faint}">${SCENE_LINE}</p></header><div style="display: flex; gap: 32px; align-items: flex-start">${cols}</div></div>`
  return { html, width, height: 1300, title }
}
function write(name, { html, width, height, title }) {
  const page = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&amp;family=IBM+Plex+Sans:wght@400;500&amp;display=swap">
<style>
body{margin:0}
:root{color-scheme:dark}
*{scrollbar-width:thin;scrollbar-color:#2C383D transparent}
button,select,input{font:inherit;color:inherit;margin:0}
button{background:none;border:0;padding:0;cursor:pointer}
a{color:#8EBDE3}a:hover{color:#B5D4F0}
</style>
</helmet>
${html}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${width},"height":${height}}}'>
class Component extends DCLogic {
  renderVals() {
    return {};
  }
}
</script>
</body>
</html>
`
  writeFileSync(new URL(`${name}.dc.html`, OUT), page, 'utf8')
  console.log(name, width, height)
}

const toDealRow = (c) => `${int(c.toDeal)} PV`
const gameRow = (c) => `${int(c.health)} PV`
// Track C's line under the stats: by how much the world counts your hits, and the health to deal that makes.
const worldNote = (world) =>
  `<p style="flex: none; margin: -6px 0 0; font-size: 12px; line-height: 16px; color: ${C.faint}">Ton monde compte tes coups ×${fmt(world.you)} : il faut en infliger ${int(world.troll.toDeal)} pour l'abattre.</p>`

write('PV-A', board(
  'A · Les PV dans l’unité de tes coups',
  'A · Les PV dans l’unité de tes coups',
  'PV compte ton monde, comme À infliger à côté : ce que tes coups doivent totaliser, tels que le jeu les affiche sur chaque coup. Un seul nombre, sur la fiche et dans le Bestiaire.',
  'Pour : la fiche ne parle qu’une unité ; PV et À infliger gardent leur rapport (339 = 30 % de 1 129, comme 180 de 600) ; le Bestiaire classe les créatures comme les ressent ton groupe. Contre : les 600 du jeu n’apparaissent plus nulle part ; rien ne dit que le nombre a bougé avec ton monde.',
  [
    ['BESTIAIRE · DIFFICILE, 3 JOUEURS', bestiaryPhone(HARD, toDealRow), 'Chaque ligne donne les PV à infliger : Troll 1 129, Ours 941.'],
    ['TROLL · DIFFICILE, 3 JOUEURS', sheetPhone(HARD.troll, { health: { value: int(HARD.troll.toDeal) } }), 'PV 1 129 à côté d’À infliger 339 : même unité.'],
    ['TROLL · TRÈS FACILE, SEUL', sheetPhone(EASY.troll, { health: { value: int(EASY.troll.toDeal) } }), 'Dans l’autre sens : tes coups comptent plus, il en faut 480.'],
  ],
))

write('PV-B', board(
  'B · Ce qu’il faut infliger, les PV du jeu dessous',
  'B · Ce qu’il faut infliger, les PV du jeu dessous',
  'Comme A, et la case PV de la fiche garde en petit les PV max du jeu, quand ton monde les change. En Normal seul, la ligne disparaît. Le Bestiaire n’a que le nombre de ton monde.',
  'Pour : même unité côte à côte, et le chiffre du jeu (celui du wiki) reste sous les yeux, ce qui évite de croire à une erreur. Contre : une ligne de plus dans la case ; dans le Bestiaire, le 600 ne se lit qu’en ouvrant la fiche.',
  [
    ['BESTIAIRE · DIFFICILE, 3 JOUEURS', bestiaryPhone(HARD, toDealRow), 'Comme A.'],
    ['TROLL · DIFFICILE, 3 JOUEURS', sheetPhone(HARD.troll, { health: { value: int(HARD.troll.toDeal), under: `${int(HARD.troll.health)} DE BASE` } }), '« 600 DE BASE » sous 1 129 : les PV max du jeu, que ton monde ne change pas.'],
    ['TROLL · TRÈS FACILE, SEUL', sheetPhone(EASY.troll, { health: { value: int(EASY.troll.toDeal), under: `${int(EASY.troll.health)} DE BASE` } }), 'Même ligne quand il en faut moins.'],
  ],
))

write('PV-C', board(
  'C · Les PV du jeu, une ligne explique',
  'C · Les PV du jeu, une ligne explique',
  'Les PV restent ceux du jeu, sur la fiche et dans le Bestiaire. Quand ton monde change tes coups, une ligne sous les chiffres de la fiche dit de combien, et ce qu’il faut infliger. Rien en Normal seul.',
  'Pour : le chiffre du jeu partout ; le Bestiaire ne change pas. Contre : une ligne de plus sur la fiche ; PV et À infliger restent dans deux unités côte à côte (339 sur 600 laisse croire qu’il faut 56 % de ses PV pour le faire tituber, c’est 30 %) ; le Bestiaire ne compte pas ton monde.',
  [
    ['BESTIAIRE · DIFFICILE, 3 JOUEURS', bestiaryPhone(HARD, gameRow), 'Inchangé : les PV du jeu.'],
    ['TROLL · DIFFICILE, 3 JOUEURS', sheetPhone(HARD.troll, { health: { value: int(HARD.troll.health) }, note: worldNote(HARD) }), 'PV 600, et la ligne sous les chiffres.'],
    ['TROLL · TRÈS FACILE, SEUL', sheetPhone(EASY.troll, { health: { value: int(EASY.troll.health) }, note: worldNote(EASY) }), 'Même ligne quand tes coups comptent plus.'],
  ],
))

// ——— Track A on a desktop, the owner's pick ————————————————————————————————————————————————————————————————————————

// The sidebar of Desktop-Bestiaire, Ton monde set to Hard with 3 players, Humide off.
const DESKTOP_BESTIARY = readFileSync(new URL('Desktop-Bestiaire.dc.html', OUT), 'utf8')
const NAV = DESKTOP_BESTIARY.slice(DESKTOP_BESTIARY.indexOf('<nav aria-label="Navigation principale"'), DESKTOP_BESTIARY.indexOf('</nav>') + '</nav>'.length)
  .replace('Ton monde : combat normal, 1 joueur', 'Ton monde : combat difficile, 3 joueurs')
  .replace('<span style="font-size: 14px">Normal</span>', '<span style="font-size: 14px">Difficile</span>')
  .replace('>1 JOUEUR · ×1<', `>3 JOUEURS · ×${fmt(HARD.enemy)}<`)
  .replace('aria-checked="{{ wetChecked }}"', 'aria-checked="false"')
  .replace(' onClick="{{ toggleWet }}"', '')
  .replace('{{ wetBorder }}', C.line)
  .replace('{{ wetTrackBorder }}', C.faint)
  .replace('{{ wetTrack }}', C.line)
  .replace('{{ wetKnob }}', '1px')
  .replace('{{ wetKnobColor }}', C.secondary)
if (NAV.includes('{{')) throw new Error('a hole is left in the sidebar')
const deskPill = (verdict, paths) => {
  const tone = verdict === null ? null : TONE[verdict]
  return `<span style="width: 26px; height: 26px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${tone ? C[`${tone}Fill`] : C.line}; color: ${tone ? C[tone] : C.faint}">${svg(paths, 15)}</span>`
}
function deskList(world, current) {
  const items = world.blackForest.map((c) => {
    const dodge = c.dodgeable === null ? null : c.dodgeable ? 'holds' : 'broken'
    return `<li style="border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; gap: 4px; padding: 10px 16px;${c.name === current ? ` background: ${C.selection}` : ''}"><span style="display: flex; align-items: center; gap: 10px"><span style="flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 15px">${c.name}${c.qualifier ? `<span style="color: ${C.secondary}"> · ${c.qualifier}</span>` : ''}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${toDealRow(c)}</span></span><span style="display: flex; gap: 4px">${deskPill(c.block, SHIELD)}${deskPill(c.parry, PARRY)}${deskPill(dodge, DODGE)}</span></span><span style="font-size: 13px; color: ${C[c.advice.tone]}">${c.advice.text}</span></span></li>`
  }).join('')
  return `<section aria-label="Créatures" style="flex: 0 0 400px; box-sizing: border-box; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-right: 1px solid ${C.line}">` +
    `<span style="flex: none; display: flex; align-items: center; gap: 8px; height: 40px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; padding: 0 12px; font-size: 14px; color: ${C.faint}">${svg('<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>', 16, { color: C.faint, width: 1.75 })}Monstre ou attaque, tous biomes</span>` +
    `<div style="flex: none; display: flex; align-items: center; background: ${C.surface}; border-radius: 6px"><span style="width: 44px; height: 48px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${svg('<path d="M15 6l-6 6 6 6"></path>', 20, { width: 1.75 })}</span><div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px"><span style="font-size: 15px; font-weight: 500">Forêt noire</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">BIOME 2 SUR 8 · ${world.blackForest.length} CRÉATURES</span></div><span style="width: 44px; height: 48px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${CHEVRON(20, C.secondary)}</span></div>` +
    `<div style="flex: none; display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 6px; border-bottom: 1px solid ${C.line}"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">COMMENT LE PRENDRE</span><span style="${MONO}; font-size: 11px; color: ${C.faint}">SANS TES EFFETS TEMPORAIRES</span></div>` +
    `<ul style="flex: 1; min-height: 0; overflow: hidden; list-style: none; margin: -12px -16px 0; padding: 0; display: flex; flex-direction: column">${items}</ul></section>`
}
const WORDS = { holds: 'TIENT', staggered: 'TU TITUBES', broken: 'BRISÉ', unblockable: 'IMPARABLE' }
function deskSheet(sheet) {
  const deskStat = (label, value, tone) =>
    `<div style="background: ${C.surface}; border-radius: 6px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>${tone ? `<span style="font-size: 15px; padding-top: 4px; color: ${tone === 'none' ? C.secondary : C[tone]}">${value}</span>` : `<span style="${MONO}; font-size: 24px">${value}</span>`}</div>`
  const chips = Object.entries(sheet.modifiers).filter(([type, state]) => TYPES[type] && STATES[state]).sort((a, b) => ORDER.indexOf(a[1]) - ORDER.indexOf(b[1]))
  const grid = 'display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) 80px repeat(3, minmax(0, 1.2fr)) 96px; gap: 12px; align-items: center'
  const word = (verdict) => `<span style="${MONO}; font-size: 12px; font-weight: 500; color: ${C[TONE[verdict]]}">${WORDS[verdict]}</span>`
  const table = `<div role="table" style="display: flex; flex-direction: column; border: 1px solid ${C.line}; border-radius: 6px; overflow: hidden">` +
    `<div role="row" style="${grid}; padding: 10px 16px; background: ${C.surface}; font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}"><span>ATTAQUE</span><span>PORTÉE</span><span style="text-align: right">DÉGÂTS</span><span>BLOCAGE</span><span>PARADE</span><span>ESQUIVE</span><span></span></div>` +
    sheet.attacks.map((a) => `<div role="row" style="${grid}; min-height: 52px; padding: 8px 16px; box-sizing: border-box; border-top: 1px solid ${C.lineSoft}; font-size: 14px"><span style="display: flex; flex-direction: column; gap: 3px; min-width: 0"><span>${a.name}</span><span style="${MONO}; font-size: 10px; color: ${C.secondary}; white-space: nowrap">${a.types.map((type, j) => typeIcon(type, 12, j === 0 ? '0 3px 0 0' : '0 3px 0 6px') + TYPES[type][0]).join('')}</span></span><span style="${MONO}; font-size: 12px; color: ${C.secondary}">${KINDS[a.kind]}</span><span style="text-align: right; ${MONO}; font-size: 16px">${a.damage}</span>${word(a.block)}${word(a.parry)}<span style="${MONO}; font-size: 12px; font-weight: 500; color: ${a.dodgeable ? C.ok : C.bad}">${a.dodgeable ? 'ESQUIVABLE' : 'INESQUIVABLE'}</span><span style="display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: ${C.accent}">Simuler${CHEVRON(14, C.accent)}</span></div>`).join('') +
    `</div>`
  const starGroup = `<div style="display: flex; border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden">${[0, 1, 2].map((s) => `<span style="width: 60px; height: 36px; display: flex; align-items: center; justify-content: center; ${MONO}; font-size: 13px; ${s === 0 ? `background: ${C.accent}; color: ${C.bg}; font-weight: 500` : `color: ${C.secondary}`}">${s}★</span>`).join('')}</div>`
  return `<section style="flex: 1; min-width: 0; overflow: hidden; box-sizing: border-box; padding: 24px 32px 32px"><div style="max-width: 860px; display: flex; flex-direction: column; gap: 24px">` +
    `<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px"><div style="display: flex; flex-direction: column; gap: 4px"><h2 style="margin: 0; font-size: 28px; font-weight: 500">${sheet.name}</h2><span style="${MONO}; font-size: 12px; color: ${C.secondary}">FORÊT NOIRE</span></div>${starGroup}</div>` +
    `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">${deskStat('PV', int(sheet.toDeal))}${deskStat('À INFLIGER', int(sheet.toInflict))}${deskStat('TA PARADE', sheet.parryStaggers ? 'Le fait tituber' : 'Ne le fait pas tituber', sheet.parryStaggers ? 'ok' : 'none')}${deskStat('COMMENT LE PRENDRE', sheet.advice.text, sheet.advice.tone)}</div>` +
    CARD +
    `<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">FAIBLESSES ET RÉSISTANCES</span><div style="display: flex; gap: 8px 12px; flex-wrap: wrap; align-items: center; ${MONO}; font-size: 12px">${chips.map(([type, state]) => chip(type, state)).join('')}<span style="font-size: 11px; color: ${C.faint}">${chips.length ? 'Tout le reste ×1' : 'Tout ×1'}</span></div></div>` +
    table + `</div></section>`
}
write('PV-A-Desktop', {
  html: `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; overflow: hidden">` + NAV +
    `<main style="flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; box-sizing: border-box"><header style="padding: 28px 32px 16px; display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">Bestiaire</h1><p style="margin: 0; font-size: 15px; color: ${C.secondary}">Comment prendre chaque créature avec ton équipement.</p></header>` +
    `<div style="flex: 1; min-height: 0; display: flex; border-top: 1px solid ${C.line}">${deskList(HARD, 'Troll')}${deskSheet(HARD.troll)}</div></main></div>`,
  width: 1440, height: 900, title: 'PV et ton monde — A · desktop, Difficile à 3 joueurs',
})
