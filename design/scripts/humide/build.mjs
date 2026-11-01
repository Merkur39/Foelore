// Writes the « Humide et Barrière · pistes » boards (#69) from out/data.json: three tracks for where Wet (« Humide »,
// the game's word) and the Staff of Protection's Magic barrier are switched on, and how a sheet says they are. Static
// boards, phones only, the figures from the app's engine (data.mts); the barrier's count from the game's rules.
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
const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const ICON = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
const svg = (paths, size, { color = 'currentColor', width = 2, style = '' } = {}) =>
  `<svg ${ICON.replace('stroke="currentColor"', `stroke="${color}"`)} stroke-width="${width}" width="${size}" height="${size}"${style ? ` style="${style}"` : ''}>${paths}</svg>`

const CHEVRON = (size, color) => svg('<path d="M9 6l6 6-6 6"></path>', size, { color, width: 1.75, style: 'flex: none' })
const BACK = svg('<path d="M19 12H5M11 6l-6 6 6 6"></path>', 22, { width: 1.75 })
const PLUS = svg('<path d="M12 5v14M5 12h14"></path>', 16, { style: 'flex: none' })
const MINUS = svg('<path d="M5 12h14"></path>', 18, { width: 1.75 })
const SHIELD = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path>'
const PARRY = SHIELD + '<path d="M13 7.5l-3 4.5h4l-3 4.5"></path>'
const DODGE = '<path d="M4 16a8 8 0 0 1 14.5-6.5"></path><path d="M19 4.5v5h-5"></path><path d="M3 20h8"></path>'
const GLOBE = '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"></path>'
const RAIN = '<path d="M7 15a4 4 0 0 1-.5-7.97A6 6 0 0 1 18 8a3.5 3.5 0 0 1 0 7H7z"></path><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"></path>'
const PAW = '<circle cx="6.5" cy="10" r="2"></circle><circle cx="12" cy="6.5" r="2"></circle><circle cx="17.5" cy="10" r="2"></circle><path d="M8 18c0-3 1.8-5 4-5s4 2 4 5c0 1.7-1.8 2.5-4 2.5S8 19.7 8 18z"></path>'
const SETTINGS = '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"></path><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="17" cy="18" r="2"></circle>'
const ADVICE_ICON = {
  ok: '<path d="M5 12l5 5L20 7"></path>',
  warn: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
  bad: '<path d="M6 6l12 12M18 6L6 18"></path>',
}
// The canvas's words and icons for the damage types (scripts/damage_types.py), frost as the game names it.
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

const SWITCH = (on) =>
  `<span aria-hidden="true" style="flex: none; width: 44px; height: 44px; margin: -4px 0; display: flex; align-items: center; justify-content: center"><span style="position: relative; width: 38px; height: 22px; box-sizing: border-box; border: 1px solid ${on ? C.accent : C.faint}; border-radius: 12px; background: ${on ? C.accent : C.line}"><span style="position: absolute; top: 1px; left: ${on ? '17px' : '1px'}; width: 18px; height: 18px; border-radius: 50%; background: ${on ? C.bg : C.secondary}"></span></span></span>`
// A − / + field, as PV MAX and COMPÉTENCE BLOCAGE in Ton équipement.
const stepper = (label, value, { width = '100%', id } = {}) =>
  `<div style="display: flex; flex-direction: column; gap: 6px; width: ${width}"><label${id ? ` for="${id}"` : ''} style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}; white-space: nowrap">${label}</label>` +
  `<div style="display: flex; align-items: center; border: 1px solid ${C.line}; border-radius: 4px; background: ${C.bg}"><span style="width: 44px; height: 40px; display: flex; align-items: center; justify-content: center">${MINUS}</span><span style="flex: 1; text-align: center; ${MONO}; font-size: 17px">${value}</span><span style="width: 44px; height: 40px; display: flex; align-items: center; justify-content: center">${svg('<path d="M12 5v14M5 12h14"></path>', 18, { width: 1.75 })}</span></div></div>`
// A row of the card: a name, its kind and duration, and a switch, or why it changes nothing; `more` under it when on.
const fxRow = ({ name, tag, on = false, idle = null, more = '' }, first) =>
  `<div style="padding: 8px 0;${first ? '' : ` border-top: 1px solid ${C.lineSoft}`}"><div style="display: flex; align-items: center; gap: 12px">` +
  `<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 18px; color: ${idle ? C.secondary : C.ink}">${name}</span>` +
  `<span style="${MONO}; font-size: 10px; line-height: 13px; letter-spacing: 0.04em; color: ${C.faint}">${tag}</span>` +
  (idle ? `<span style="font-size: 12px; line-height: 16px; color: ${C.faint}">${idle}</span>` : '') +
  `</div>${idle && !on ? '' : SWITCH(on)}</div>${on && more ? more : ''}</div>`
const rows = (items) => items.map((item, i) => fxRow(item, i === 0)).join('')
const subhead = (text) =>
  `<div style="padding: 10px 0 2px; border-top: 1px solid ${C.lineSoft}; font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">${text}</div>`
function card({ open, summary, body }) {
  const chevron = svg('<path d="M6 9l6 6 6-6"></path>', 18, { color: C.secondary, style: `flex: none; transform: ${open ? 'rotate(180deg)' : 'none'}` })
  return `<div style="flex: none; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.surface}">` +
    `<div style="display: flex; align-items: center; gap: 12px; min-height: 56px; box-sizing: border-box; padding: 8px 12px"><span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; line-height: 20px">Avec tes effets temporaires</span><span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">${summary}</span></span>${chevron}</div>` +
    (open ? `<div style="padding: 0 12px; border-top: 1px solid ${C.lineSoft}">${body}<p style="margin: 0; padding: 8px 0 10px; border-top: 1px solid ${C.lineSoft}; font-size: 12px; line-height: 16px; color: ${C.faint}">Vaut jusqu'à ce que tu changes de créature.</p></div>` : '') +
    `</div>`
}
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
// `under(a, i)`: a line of its own under an attack's tags (what the barrier takes, in tracks A and B).
function attacks(sheet, under = () => '') {
  const grid = 'display: grid; grid-template-columns: minmax(0, 1fr) 40px 96px 16px; gap: 8px; align-items: center'
  return `<section style="flex: none; display: flex; flex-direction: column"><div style="${grid}; padding-bottom: 6px; border-bottom: 1px solid ${C.line}; font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}"><h2 style="margin: 0; font-size: 10px; font-weight: 400">SES ATTAQUES</h2><span style="text-align: right">DÉG.</span><span style="display: flex; gap: 4px">${headIcon(SHIELD, 'Blocage')}${headIcon(PARRY, 'Parade')}${headIcon(DODGE, 'Esquive')}</span><span></span></div>` +
    sheet.attacks.map((a, i) => `<div style="${grid}; min-height: 56px; padding: 6px 0; box-sizing: border-box; border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 14px">${a.name}</span><span style="${MONO}; font-size: 10px; color: ${C.secondary}; white-space: nowrap">${tagLine(a)}</span>${under(a, i)}</span><span style="text-align: right; ${MONO}; font-size: 15px">${a.damage}</span><span aria-hidden="true" style="display: flex; gap: 4px">${verdictBox(a.block, SHIELD)}${verdictBox(a.parry, PARRY)}${verdictBox(a.dodgeable ? 'holds' : 'broken', DODGE)}</span>${CHEVRON(16, C.faint)}</div>`).join('') +
    `</section>`
}
const stat = (label, value, tone) =>
  `<div style="background: ${C.surface}; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>${tone ? `<span style="font-size: 13px; color: ${tone === 'none' ? C.secondary : C[tone]}; padding-top: 3px">${value}</span>` : `<span style="${MONO}; font-size: 18px">${value}</span>`}</div>`
const adviceLine = (advice) =>
  `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${C[advice.tone]}">${svg(ADVICE_ICON[advice.tone], 16, { width: 2.25, style: 'flex: none' })}<span>${advice.text}</span></div>`
/** A creature's sheet: `blocks` go between the advice and the resistances (the card, …), `before` above the attacks;
 * `scroll` shifts the page up, as if scrolled. */
function sheetPhone(sheet, { biome, blocks = [], before = '', under, scroll = 0 }) {
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px; position: relative; z-index: 1; background: ${C.bg}"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${BACK}</span><h1 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">${sheet.name}</h1><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${biome}</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 4px 16px 12px; overflow: hidden"><div style="display: flex; flex-direction: column; gap: 14px; margin-top: ${-scroll}px">` +
    `<div style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: ${C.line}; border: 1px solid ${C.line}; border-radius: 6px; overflow: hidden">${stat('PV', sheet.health.toLocaleString('fr-FR'))}${sheet.toInflict === null ? stat('À INFLIGER', 'Ne titube jamais', 'none') : stat('À INFLIGER', sheet.toInflict)}${stat('TA PARADE', sheet.parryStaggers ? 'Le fait tituber' : 'Ne le fait pas tituber', sheet.parryStaggers ? 'ok' : 'none')}</div>` +
    adviceLine(sheet.advice) + blocks.join('') + resistances(sheet.modifiers) + before + attacks(sheet, under) + `</div></main></div>`
}

// ——— The Bestiary's list and Ton contexte ————————————————————————————————————————————————————————————————————————

const pill = (verdict, paths) => {
  const tone = verdict === null ? null : TONE[verdict]
  return `<span style="width: 30px; height: 30px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${tone ? C[`${tone}Fill`] : C.line}; color: ${tone ? C[tone] : C.faint}">${svg(paths, 16)}</span>`
}
const contextButton = (wet) =>
  `<span style="height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; ${MONO}; font-size: 12px"><span style="display: flex; align-items: center; gap: 4px">${svg(SHIELD, 15, { color: C.accent })}VD ${data.early.blockPower}</span><span style="display: flex; align-items: center; gap: 4px">${svg(GLOBE, 15, { color: C.accent })}×1</span>${wet ? `<span style="display: flex; align-items: center" aria-label="Humide">${svg(RAIN, 15, { color: C.accent })}</span>` : ''}${svg('<path d="M6 9l6 6 6-6"></path>', 16, { color: C.secondary })}</span>`
function bestiaryPhone(list, { wet, sheet = '' }) {
  const items = list.map((c) => {
    const dodge = c.dodgeable === null ? null : c.dodgeable ? 'holds' : 'broken'
    return `<li style="border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; justify-content: center; gap: 4px; min-height: 64px; padding: 6px 0"><span style="display: flex; align-items: center; gap: 12px"><span style="flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 15px">${c.name}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${c.health.toLocaleString('fr-FR')} PV</span></span><span style="display: flex; gap: 6px">${pill(c.block, SHIELD)}${pill(c.parry, PARRY)}${pill(dodge, DODGE)}</span></span>` +
      `<span style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: ${C[c.advice.tone]}">${svg(ADVICE_ICON[c.advice.tone], 14, { width: 2.25, style: 'flex: none' })}<span>${c.advice.text}</span></span></span></li>`
  }).join('')
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; position: relative; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px"><span style="flex: 1; display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 500">${svg(SHIELD, 20, { color: C.accent, width: 1.75 })}Foelore</span>${contextButton(wet)}<span style="width: 44px; height: 44px; margin-right: -10px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${svg(SETTINGS, 22, { width: 1.75 })}</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 12px">` +
    `<span style="flex: none; display: flex; align-items: center; gap: 8px; height: 44px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; padding: 0 12px; font-size: 15px; color: ${C.faint}">${svg('<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>', 18, { color: C.faint, width: 1.75 })}Monstre ou attaque, tous biomes</span>` +
    `<div style="flex: none; display: flex; align-items: center; background: ${C.surface}; border-radius: 6px"><span style="width: 48px; height: 52px"></span><div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px"><span style="font-size: 16px; font-weight: 500">Prairies</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">BIOME 1 SUR 8 · ${list.length} CRÉATURES${wet ? ' · HUMIDE' : ''}</span></div><span style="width: 48px; height: 52px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${CHEVRON(20, C.secondary)}</span></div>` +
    `<div style="flex: 1; min-height: 0; display: flex; flex-direction: column"><div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; padding-bottom: 6px; border-bottom: 1px solid ${C.line}"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">COMMENT LE PRENDRE</span><span style="${MONO}; font-size: 11px; color: ${C.faint}">SANS TES EFFETS TEMPORAIRES</span></div>` +
    `<ul style="list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; overflow: hidden">${items}</ul></div></main>` +
    `<nav style="flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid ${C.line}; padding: 6px 0 14px">${['Bestiaire', 'Simulation', 'Arsenal', 'Mémo'].map((n) => `<span style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; font-size: 11px; color: ${n === 'Bestiaire' ? C.accent : C.faint}">${n}</span>`).join('')}</nav>` +
    sheet + `</div>`
}
// « Ton contexte », the bottom sheet of the context button, with Humide in it (track B).
const contextRow = (paths, label, name, sub, end) =>
  `<span style="display: flex; align-items: center; gap: 12px; padding: 12px 14px">${svg(paths, 22, { color: C.accent, width: 1.75, style: 'flex: none' })}<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span><span style="font-size: 16px">${name}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${sub}</span></span>${end}</span>`
const CONTEXT_SHEET =
  `<div style="position: absolute; inset: 0; background: rgba(4, 6, 7, 0.72)"></div>` +
  `<div role="dialog" aria-label="Ton contexte" style="position: absolute; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; padding: 8px 4px 24px; border-top: 1px solid ${C.line}; border-radius: 14px 14px 0 0; background: ${C.surface}">` +
  `<span aria-hidden="true" style="align-self: center; width: 36px; height: 4px; border-radius: 2px; background: ${C.line}"></span>` +
  `<div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px 6px"><span style="font-size: 17px; font-weight: 500">Ton contexte</span><span style="font-size: 12px; color: ${C.faint}">Chaque verdict en dépend</span></div>` +
  contextRow(SHIELD, 'TON ÉQUIPEMENT', 'Bouclier en bois', `N1 · VD ${data.early.blockPower}`, CHEVRON(18, C.secondary)) +
  `<div style="height: 1px; background: ${C.lineSoft}"></div>` +
  contextRow(GLOBE, 'TON MONDE', 'Normal', '1 JOUEUR · ×1', CHEVRON(18, C.secondary)) +
  `<div style="height: 1px; background: ${C.lineSoft}"></div>` +
  contextRow(RAIN, 'MÉTÉO', 'Humide', 'FEU ×0,5 · GLACE ET FOUDRE ×1,5', SWITCH(true)) +
  `<p style="margin: 0; padding: 0 14px; font-size: 12px; line-height: 16px; color: ${C.faint}">Compté pour toutes les créatures des Prairies, jusqu'à ce que tu l'éteignes ou changes de biome. Seulement là où il pleut.</p>` +
  `</div>`

// ——— Ton équipement, « Du groupe » (track B) —————————————————————————————————————————————————————————————————————

const carryRow = ({ label, name, lines, end = CHEVRON(14, C.secondary) }, last = false) =>
  `<div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px;${last ? '' : ` border-bottom: 1px solid ${C.lineSoft}`}">` +
  `<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>` +
  `<span style="display: flex; align-items: center; gap: 6px"><span style="flex: 1; min-width: 0; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${name}</span>${end}</span></span>` +
  `<span style="display: flex; flex-direction: column; ${MONO}; font-size: 12px; line-height: 16px; color: ${C.faint}">${lines.map((l) => `<span style="white-space: nowrap">${l}</span>`).join('')}</span></div>`
const addRow = (text, last = false) =>
  `<span style="display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; box-sizing: border-box; padding: 0 10px; font-size: 14px; line-height: 18px; color: ${C.accent};${last ? '' : ` border-bottom: 1px solid ${C.lineSoft}`}">${PLUS}${text}</span>`
const box = (items) => `<div style="border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden; background: ${C.surface}">${items.join('')}</div>`
const section = (id, title, body, note) =>
  `<section aria-labelledby="${id}" style="flex: none; display: flex; flex-direction: column; gap: 6px">` +
  `<h3 id="${id}" style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 400; letter-spacing: 0.08em; color: ${C.secondary}">${title}</h3>${body}` +
  (note ? `<p style="margin: 2px 0 0; font-size: 12px; line-height: 17px; color: ${C.faint}">${note}</p>` : '') +
  `</section>`
// The Profil board of Origine, « Pouvoirs du groupe » swapped for `sections`, scrolled to the bottom.
const PROFIL = readFileSync(new URL('Profil.dc.html', OUT), 'utf8')
function gearPhone(sections) {
  const start = PROFIL.indexOf('<div role="dialog"')
  const dialog = PROFIL.slice(start, PROFIL.indexOf('</x-dc>'))
  const mainOpen = dialog.indexOf('<main ')
  const innerStart = dialog.indexOf('>', mainOpen) + 1
  const mainClose = dialog.indexOf('</main>')
  let inner = dialog.slice(innerStart, mainClose)
  inner = inner.slice(0, inner.indexOf('<section aria-labelledby="q-group"')) + sections.join('\n')
  const main = `<main style="flex: 1; min-height: 0; position: relative; overflow: hidden"><div style="position: absolute; left: 16px; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 18px">${inner}</div></main>`
  return dialog.slice(0, mainOpen) + main + dialog.slice(mainClose + '</main>'.length)
}

// ——— The Simulation (track C) ———————————————————————————————————————————————————————————————————————————————————

const WORD = { holds: 'TIENT', staggered: 'TU TITUBES', broken: 'BRISÉ', unblockable: 'IMPARABLE' }
const stamina = (s) => (s < 0 ? `+${fmt(-s)} endurance` : s === 0 ? '0 endurance' : `−${Math.round(s)} endurance`)
function guardCard(label, r) {
  const tone = TONE[r.verdict]
  const parts = [r.bar.before, r.bar.shield, r.bar.armor]
  let used = 0
  const widths = parts.map((part) => {
    const w = Math.min(100 - used, (Math.max(0, part) / r.bar.limit) * 100)
    used += w
    return w
  })
  const total = r.bar.before + r.bar.shield + r.bar.armor
  return `<div style="display: flex; flex-direction: column; gap: 6px; padding: 12px; border-radius: 6px; background: ${C.surface}; border: 1px solid ${tone === 'ok' ? C.line : C[`${tone}Fill`]}">` +
    `<span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>` +
    `<span style="${MONO}; font-size: 14px; font-weight: 500; color: ${C[tone]}">${WORD[r.verdict]}</span>` +
    `<span style="${MONO}; font-size: 22px; line-height: 1.2">${fmt(r.taken)} <span style="font-size: 11px; color: ${C.faint}">subis</span></span>` +
    `<span style="${MONO}; font-size: 12px; color: ${C.secondary}">${stamina(r.stamina)}</span>` +
    `<div style="height: 8px; display: flex; overflow: hidden; border-radius: 2px; background: ${C.bg}"><span style="width: ${widths[0].toFixed(2)}%; background: ${C.line}"></span><span style="width: ${widths[1].toFixed(2)}%; background: ${C[`${tone}Fill`]}"></span><span style="width: ${widths[2].toFixed(2)}%; background: ${C[tone]}"></span></div>` +
    `<span style="${MONO}; font-size: 11px; color: ${r.staggered ? C[tone] : C.faint}">${r.staggered ? 'barre : déborde' : `barre : ${fmt(total)} / ${fmt(r.bar.limit)}`}</span></div>`
}
const seg = (labels, picked) =>
  `<div style="flex: none; display: flex; border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden">${labels.map((l, i) => `<span style="flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; font-size: 13px; ${i === picked ? `background: ${C.accent}; color: ${C.bg}; font-weight: 500` : `color: ${C.secondary}`}">${l}</span>`).join('')}</div>`
function simulationPhone(creatureName, attack, { blocks = [] }) {
  const chipHtml = `<div style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 12px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.bg}">${svg(PAW, 22, { color: C.accent, width: 1.75 })}<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px">${creatureName} · ${attack.name}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}; white-space: nowrap">${tagLine(attack)} · CHANGER</span></span><span style="${MONO}; font-size: 22px">${attack.damage}</span>${CHEVRON(16, C.faint)}</div>`
  const hit = `<section style="flex: none; background: ${C.surface}; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px">${chipHtml}<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">BARRE DE STAGGER AVANT LE COUP</span><div style="display: flex; border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden">${['0 %', '25 %', '50 %', '75 %'].map((l, i) => `<span style="flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; ${MONO}; font-size: 12px; ${i === 0 ? `background: ${C.accent}; color: ${C.bg}; font-weight: 500` : `color: ${C.secondary}`}">${l}</span>`).join('')}</div></div></section>`
  const advice = attack.block === 'staggered' ? { tone: 'warn', text: 'Pare-le : en bloquant, tu titubes' } : { tone: 'ok', text: 'Bloque-le : tu tiens sans tituber' }
  const header = `<header style="flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px"><span style="flex: 1; display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 500">${svg(SHIELD, 20, { color: C.accent, width: 1.75 })}Foelore</span><span style="height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; ${MONO}; font-size: 12px"><span style="display: flex; align-items: center; gap: 4px">${svg(SHIELD, 15, { color: C.accent })}VD ${data.mockups.blockPower}</span><span style="display: flex; align-items: center; gap: 4px">${svg(GLOBE, 15, { color: C.accent })}×1</span>${svg('<path d="M6 9l6 6 6-6"></path>', 16, { color: C.secondary })}</span><span style="width: 44px; height: 44px; margin-right: -10px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${svg(SETTINGS, 22, { width: 1.75 })}</span></header>`
  const nav = `<nav style="flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid ${C.line}; padding: 6px 0 14px">${['Bestiaire', 'Simulation', 'Arsenal', 'Mémo'].map((n) => `<span style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; font-size: 11px; color: ${n === 'Simulation' ? C.accent : C.faint}">${n}</span>`).join('')}</nav>`
  const main = `<main style="flex: 1; min-height: 0; overflow: hidden; padding: 4px 16px 12px"><div style="display: flex; flex-direction: column; gap: 12px">${seg(["Attaque d'un monstre", 'Valeur libre'], 0)}${hit}${blocks.join('')}${adviceLine(advice)}<div style="flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; align-items: start">${guardCard('EN BLOQUANT', attack.sim.block)}${guardCard('EN PARANT', attack.sim.parry)}</div></div></main>`
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">${header}${main}${nav}</div>`
}

// ——— Boards ————————————————————————————————————————————————————————————————————————————————————————————————————

const GEAR_LINE = `Eikthyr : Bouclier en bois N1, Blocage 0, haillons (armure ${data.early.armor}), 45 PV, rien d'emporté. Lox : Bouclier en argent N3, Blocage 25, pièces en fer N1 et cape de loup N3 (armure ${data.mockups.armor}), 150 PV, ce qu'emporte Origine (Broche en fer, Masse-d'Os, hydromel de résistance au gel ; le Pouvoir de Fader d'un ami). Combat normal, 1 joueur. Barrière lancée avec Magie du sang 20 : 300 à absorber. Chiffres du moteur de l'app ; Humide et la Barrière comptés d'après le code du jeu.`
function board(title, heading, desc, proscons, phones) {
  const cols = phones.map(([label, html, caption]) => `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span><div style="border-radius: 2px; overflow: hidden">${html}</div>${caption ? `<span style="font-size: 12px; line-height: 1.45; color: ${C.faint}">${caption}</span>` : ''}</div>`).join('')
  const width = 40 * 2 + 390 * phones.length + 32 * (phones.length - 1)
  const html = `<div style="width: ${width}px; height: 1300px; box-sizing: border-box; padding: 40px; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 28px"><header style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">${heading}</h1><p style="margin: 0; max-width: 1500px; font-size: 15px; line-height: 1.5; color: ${C.secondary}">${desc}</p>${proscons ? `<p style="margin: 0; max-width: 1500px; font-size: 13px; line-height: 1.5; color: ${C.faint}">${proscons}</p>` : ''}<p style="margin: 0; max-width: 1500px; font-size: 12px; line-height: 1.5; color: ${C.faint}">${GEAR_LINE}</p></header><div style="display: flex; gap: 32px; align-items: flex-start">${cols}</div></div>`
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

// ——— What the tracks share ———————————————————————————————————————————————————————————————————————————————————————

const EIK = data.eikthyr
const LOX = data.lox.none
const BARRIER = data.lox.barrier[20]
const hitsOf = (name) => BARRIER.attacks.find((a) => a.name === name)
const WET_TAG = 'PLUIE OU EAU · 2 MIN APRÈS'
const BARRIER_TAG = 'BÂTON DE PROTECTION · 1 À 4 MIN'
const wetFx = (sheet, on) => ({ name: 'Humide', tag: WET_TAG, on, idle: sheet.idle.Wet })
const carriedFx = [
  { name: 'Broche en fer', tag: "BIBELOT · 30 S DÈS 65 D'ADRÉNALINE" },
  { name: "Masse-d'Os", tag: 'POUVOIR · 5 MIN' },
  { name: 'Hydromel de résistance au gel', tag: 'BOISSON · 10 MIN', idle: LOX.idle.Potion_frostresist },
  { name: 'Pouvoir de Fader', tag: 'POUVOIR DU GROUPE · 5 MIN' },
]
// Under the barrier's row once on: whose Blood Magic, and what it absorbs.
const bloodMagic = `<div style="display: flex; align-items: flex-end; gap: 12px; padding: 4px 0 2px">${stepper('MAGIE DU SANG DE QUI LA LANCE', BARRIER.bloodMagic, { width: '184px' })}<span style="flex: 1; padding-bottom: 10px; ${MONO}; font-size: 12px; line-height: 16px; color: ${C.secondary}">absorbe ${BARRIER.capacity}</span></div>`
const barrierFx = (on, more = bloodMagic) => ({ name: 'Barrière magique', tag: BARRIER_TAG, on, more })
// Tracks A and B: under each attack, how many such hits the barrier takes before it breaks.
const barrierUnder = (a) => {
  const b = hitsOf(a.name)
  const counted = b.counted !== a.damage ? ` (compte ${b.counted})` : ''
  return `<span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">Barrière&nbsp;: ${b.hits} coup${b.hits > 1 ? 's' : ''}${counted}</span>`
}
const summary = (names) => (names.length === 0 ? 'Aucun allumé' : new Intl.ListFormat('fr', { type: 'conjunction' }).format(names))
// Track C: the barrier as a reserve, above the attacks; the verdicts under it are those once it breaks.
const reserve = (title, lines, note) =>
  `<section style="flex: none; display: flex; flex-direction: column; gap: 8px; padding: 12px; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.surface}">` +
  `<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px"><span style="font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">BARRIÈRE MAGIQUE</span><span style="${MONO}; font-size: 12px; color: ${C.secondary}">${title}</span></div>` +
  lines.join('') + (note ? `<span style="font-size: 12px; line-height: 16px; color: ${C.faint}">${note}</span>` : '') + `</section>`
const reserveBar = (used, capacity) =>
  `<div style="height: 8px; display: flex; overflow: hidden; border-radius: 2px; background: ${C.bg}"><span style="width: ${Math.min(100, (used / capacity) * 100).toFixed(2)}%; background: ${C.secondary}"></span></div>`
const reserveLine = (name, counted, hits, listed) =>
  `<div style="display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 13px"><span>${name}${counted !== listed ? ` <span style="${MONO}; font-size: 11px; color: ${C.faint}">compte ${counted}</span>` : ''}</span><span style="${MONO}; font-size: 13px">${hits} coup${hits > 1 ? 's' : ''}</span></div>`

// ——— A: everything in the card, nothing declared ——————————————————————————————————————————————————————————————————

write('Humide-A', board(
  'Humide et Barrière — piste A',
  'A · Dans la carte, sans rien déclarer',
  'Humide et la Barrière magique rejoignent la carte « Avec tes effets temporaires », après ce que tu emportes : Humide seulement dans les biomes où il pleut (Prairies, Forêt noire, Marécages, Plaines, Océan), la Barrière partout. Allumée, la Barrière demande la Magie du sang de qui la lance (toi ou un ami) et dit ce qu’elle absorbe. Sur la fiche, les verdicts restent ceux d’après la barrière ; chaque attaque dit combien de coups elle en prend.',
  'Pour : rien à préparer, tout s’allume là où on lit les verdicts. Contre : la carte apparaît sur toutes les fiches, même sans rien d’emporté, et la Barrière s’y montre à qui n’a jamais vu de Bâton de protection ; Humide est à rallumer à chaque créature alors qu’il pleut sur tout le biome.',
  [
    ['EIKTHYR · SOUS LA PLUIE', sheetPhone(EIK.wet, { biome: 'PRAIRIES', blocks: [card({ open: true, summary: 'Humide', body: rows([wetFx(EIK.wet, true), barrierFx(false)]) })] }), `Rien d’emporté : la carte ne montre qu’Humide et la Barrière (aujourd’hui, pas de carte). Humide fait la foudre ×1,5 : la Charge et le Piétinement bloqués te font tituber (barre ${fmt(EIK.wet.attacks[1].sim.block.bar.shield + EIK.wet.attacks[1].sim.block.bar.armor)} sur ${EIK.wet.attacks[1].sim.block.bar.limit}), le conseil passe de « bloque le reste » à « pare le reste ».`],
    ['LOX · LA BARRIÈRE ALLUMÉE', sheetPhone(LOX, { biome: 'PLAINES', blocks: [card({ open: true, summary: 'Barrière magique', body: rows([...carriedFx, wetFx(LOX, false), barrierFx(true)]) })], under: barrierUnder, scroll: 112 }), 'Humide est grisé : le Lox ne fait ni feu, ni glace, ni foudre. La Magie du sang se règle sous la Barrière ; 200 sans elle, 5 de plus par niveau.'],
    ['LOX · REPLIÉ', sheetPhone(LOX, { biome: 'PLAINES', blocks: [card({ open: false, summary: 'Barrière magique' })], under: barrierUnder }), `La barrière prend ${hitsOf('Morsure').hits} Morsures, mais un seul Piétinement : elle compte aussi ce qui frappe le bois et la pierre (${hitsOf('Piétinement').counted} au lieu de ${LOX.attacks[1].damage}). Une fois brisée, les verdicts sont ceux de la fiche.`],
  ],
))

// ——— B: Humide with the place, the barrier with the group ——————————————————————————————————————————————————————————

const groupBarrier = carryRow({
  label: 'BARRIÈRE MAGIQUE',
  name: `Lancée avec Magie du sang ${BARRIER.bloodMagic}`,
  lines: [`1 à 4 min · absorbe ${BARRIER.capacity}`],
})
write('Humide-B', board(
  'Humide et Barrière — piste B',
  'B · Chacun à sa place',
  'Humide est la météo : il s’allume dans « Ton contexte », avec ton équipement et ton monde, là où il pleut, et vaut pour tout le biome, la liste du Bestiaire comprise, jusqu’à ce que tu l’éteignes ou changes de biome. La Barrière vient du groupe : elle se déclare dans Ton équipement, sous « Du groupe » (ex-« Pouvoirs du groupe »), avec la Magie du sang de qui la lance, puis s’allume dans la carte comme un pouvoir du groupe.',
  'Pour : chaque chose où elle vit dans le jeu ; la pluie se règle une fois pour toutes les créatures, et la Barrière ne gêne que ceux qui la déclarent. Contre : deux endroits à connaître, et Humide oublié allumé fausse tout le biome.',
  [
    ['BESTIAIRE · TON CONTEXTE', bestiaryPhone(data.meadows.none, { wet: false, sheet: CONTEXT_SHEET }), 'Une ligne MÉTÉO sous Ton monde, seulement dans les biomes où il pleut.'],
    ['BESTIAIRE · PRAIRIES SOUS LA PLUIE', bestiaryPhone(data.meadows.wet, { wet: true }), 'Le bouton du contexte montre la pluie, le biome dit HUMIDE. Eikthyr : « pare le reste » au lieu de « bloque le reste ».'],
    ['TON ÉQUIPEMENT · DU GROUPE', gearPhone([
      section('q-group', 'DU GROUPE', box([carryRow({ label: 'POUVOIR', name: 'Pouvoir de Fader', lines: ['5 min · Feu ×0,5', 'tu titubes 2× moins vite'] }), groupBarrier, addRow('Ajouter un pouvoir du groupe', true)]), 'Ce qu’un joueur lance près de toi&nbsp;; à allumer comme les tiens. La Barrière dépend de la Magie du sang de qui la lance.'),
    ]), 'La Barrière se règle une fois : qui la lance, avec quelle Magie du sang. Sans elle, « Ajouter une barrière magique » à la place de la ligne.'],
    ['LOX · LA BARRIÈRE ALLUMÉE', sheetPhone(LOX, { biome: 'PLAINES', blocks: [card({ open: true, summary: 'Barrière magique', body: rows([...carriedFx, barrierFx(true, '')].map((fx) => (fx.name === 'Barrière magique' ? { ...fx, tag: `DU GROUPE · ABSORBE ${BARRIER.capacity} · 1 À 4 MIN` } : fx))) })], under: barrierUnder }), 'Pas de ligne Humide dans la carte : il est dans Ton contexte. Les attaques disent ce que prend la barrière, comme en A.'],
  ],
))

// ——— C: the barrier as a reserve, apart from the verdicts ———————————————————————————————————————————————————————

const BITE = LOX.attacks[0]
const reserveSheet = reserve(`ABSORBE ${BARRIER.capacity}`, BARRIER.attacks.map((b, i) => reserveLine(b.name, b.counted, b.hits, LOX.attacks[i].damage)), 'Ensuite, les verdicts ci-dessous.')
write('Humide-C', board(
  'Humide et Barrière — piste C',
  'C · La barrière en réserve',
  'On allume comme en A, dans la carte. Mais la Barrière ne se mêle pas aux verdicts : allumée, elle a son bloc au-dessus des attaques, ce qu’elle absorbe et combien de coups de chaque attaque elle prend avant de céder ; les verdicts dessous sont ceux d’après. Dans la Simulation, sa jauge montre ce que prend le coup choisi. Humide, lui, change les verdicts comme une boisson.',
  'Pour : la Barrière se lit comme ce qu’elle est, une réserve qui retarde, et la Simulation montre ce qu’un coup y prend. Contre : un bloc de plus sur la fiche, et un modèle à part pour un seul effet.',
  [
    ['LOX · LA BARRIÈRE ALLUMÉE', sheetPhone(LOX, { biome: 'PLAINES', blocks: [card({ open: true, summary: 'Barrière magique', body: rows([...carriedFx, wetFx(LOX, false), barrierFx(true)]) })], scroll: 112 }), 'Comme en A : la Magie du sang se règle sous la Barrière allumée.'],
    ['LOX · LA RÉSERVE', sheetPhone(LOX, { biome: 'PLAINES', blocks: [card({ open: false, summary: 'Barrière magique' })], before: reserveSheet }), `Le Piétinement compte ${hitsOf('Piétinement').counted} pour la barrière : elle compte aussi ce qui frappe le bois et la pierre.`],
    ['SIMULATION · MORSURE', simulationPhone('Lox', BITE, {
      blocks: [
        card({ open: false, summary: 'Barrière magique' }),
        reserve(`${hitsOf('Morsure').counted} SUR ${BARRIER.capacity}`, [reserveBar(hitsOf('Morsure').counted, BARRIER.capacity), `<span style="font-size: 13px; line-height: 18px">Elle absorbe ce coup, et en prend ${hitsOf('Morsure').hits} comme lui avant de céder.</span>`], 'Ensuite :'),
      ],
    }), 'Tant qu’elle tient, le coup ne fait rien, et bloqué il ne coûte pas d’endurance ; les cartes disent ce qui suit.'],
  ],
))

// ——— Track B on a desktop, the owner's pick ————————————————————————————————————————————————————————————————————————

// The sidebar of Desktop-Bestiaire, its chips set to `gear`, with Humide under Ton monde where it rains.
const DESKTOP_BESTIARY = readFileSync(new URL('Desktop-Bestiaire.dc.html', OUT), 'utf8')
const NAV = DESKTOP_BESTIARY.slice(DESKTOP_BESTIARY.indexOf('<nav aria-label="Navigation principale"'), DESKTOP_BESTIARY.indexOf('</nav>') + '</nav>'.length)
const SWITCH_BUTTON = (on, label) =>
  `<button type="button" role="switch" aria-checked="${on}" aria-label="${label}" style="flex: none; width: 44px; height: 44px; margin: -6px 0; display: flex; align-items: center; justify-content: center"><span aria-hidden="true" style="position: relative; width: 38px; height: 22px; box-sizing: border-box; border: 1px solid ${on ? C.accent : C.faint}; border-radius: 12px; background: ${on ? C.accent : C.line}"><span style="position: absolute; top: 1px; left: ${on ? '17px' : '1px'}; width: 18px; height: 18px; border-radius: 50%; background: ${on ? C.bg : C.secondary}"></span></span></button>`
const humideChip = (on, biome) =>
  `<div class="bw-chip" style="display: flex; align-items: center; gap: 10px; padding: 8px 4px 8px 12px; border: 1px solid ${on ? C.accent : C.line}; border-radius: 6px">` +
  svg(RAIN, 18, { color: C.accent, width: 1.75, style: 'flex: none' }) +
  `<span class="bw-label" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px">Humide</span><span style="${MONO}; font-size: 10px; line-height: 14px; color: ${C.secondary}; white-space: nowrap">FEU ×0,5<br>GLACE, FOUDRE ×1,5</span></span>` +
  SWITCH_BUTTON(on, `Humide, dans les ${biome}`) + `</div>`
function sidebar({ gear, wet, biome }) {
  let nav = NAV
  if (gear === 'early') {
    nav = nav
      .replace('Ton équipement : bouclier en argent niveau 3, compétence Blocage 25', 'Ton équipement : bouclier en bois niveau 1, compétence Blocage 0')
      .replace('>Argent N3<', '>Bois N1<')
      .replace(`>VD ${data.mockups.blockPower} · BLOCAGE 25<`, `>VD ${data.early.blockPower} · BLOCAGE 0<`)
  }
  const at = nav.indexOf('<a href="Desktop-Reglages.dc.html"')
  return nav.slice(0, at) + humideChip(wet, biome) + nav.slice(at)
}
const deskPill = (verdict, paths) => {
  const tone = verdict === null ? null : TONE[verdict]
  return `<span style="width: 26px; height: 26px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${tone ? C[`${tone}Fill`] : C.line}; color: ${tone ? C[tone] : C.faint}">${svg(paths, 15)}</span>`
}
function deskList(list, { biome, index, count, wet, current }) {
  const items = list.map((c) => {
    const dodge = c.dodgeable === null ? null : c.dodgeable ? 'holds' : 'broken'
    return `<li style="border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; gap: 4px; padding: 10px 16px;${c.name === current ? ` background: ${C.selection}` : ''}"><span style="display: flex; align-items: center; gap: 10px"><span style="flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 15px">${c.name}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${c.health.toLocaleString('fr-FR')} PV</span></span><span style="display: flex; gap: 4px">${deskPill(c.block, SHIELD)}${deskPill(c.parry, PARRY)}${deskPill(dodge, DODGE)}</span></span><span style="font-size: 13px; color: ${C[c.advice.tone]}">${c.advice.text}</span></span></li>`
  }).join('')
  return `<section aria-label="Créatures" style="flex: 0 0 400px; box-sizing: border-box; min-height: 0; display: flex; flex-direction: column; gap: 12px; padding: 16px; border-right: 1px solid ${C.line}">` +
    `<span style="flex: none; display: flex; align-items: center; gap: 8px; height: 40px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; padding: 0 12px; font-size: 14px; color: ${C.faint}">${svg('<circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path>', 16, { color: C.faint, width: 1.75 })}Monstre ou attaque, tous biomes</span>` +
    `<div style="flex: none; display: flex; align-items: center; background: ${C.surface}; border-radius: 6px"><span style="width: 44px; height: 48px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${svg('<path d="M15 6l-6 6 6 6"></path>', 20, { width: 1.75 })}</span><div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px"><span style="font-size: 15px; font-weight: 500">${biome}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">BIOME ${index} SUR 8 · ${count} CRÉATURES${wet ? ' · HUMIDE' : ''}</span></div><span style="width: 44px; height: 48px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${CHEVRON(20, C.secondary)}</span></div>` +
    `<div style="flex: none; display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 6px; border-bottom: 1px solid ${C.line}"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">COMMENT LE PRENDRE</span><span style="${MONO}; font-size: 11px; color: ${C.faint}">SANS TES EFFETS TEMPORAIRES</span></div>` +
    `<ul style="flex: 1; min-height: 0; overflow: hidden; list-style: none; margin: -12px -16px 0; padding: 0; display: flex; flex-direction: column">${items}</ul></section>`
}
const WORDS = { holds: 'TIENT', staggered: 'TU TITUBES', broken: 'BRISÉ', unblockable: 'IMPARABLE' }
function deskSheet(sheet, { biomeLine, stars, blocks = [], under = () => '' }) {
  const deskStat = (label, value, tone) =>
    `<div style="background: ${C.surface}; border-radius: 6px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>${tone ? `<span style="font-size: 15px; padding-top: 4px; color: ${tone === 'none' ? C.secondary : C[tone]}">${value}</span>` : `<span style="${MONO}; font-size: 24px">${value}</span>`}</div>`
  const chips = Object.entries(sheet.modifiers).filter(([type, state]) => TYPES[type] && STATES[state]).sort((a, b) => ORDER.indexOf(a[1]) - ORDER.indexOf(b[1]))
  const grid = 'display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) 80px repeat(3, minmax(0, 1.2fr)) 96px; gap: 12px; align-items: center'
  const word = (verdict) => `<span style="${MONO}; font-size: 12px; font-weight: 500; color: ${C[TONE[verdict]]}">${WORDS[verdict]}</span>`
  const table = `<div role="table" style="display: flex; flex-direction: column; border: 1px solid ${C.line}; border-radius: 6px; overflow: hidden">` +
    `<div role="row" style="${grid}; padding: 10px 16px; background: ${C.surface}; font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}"><span>ATTAQUE</span><span>PORTÉE</span><span style="text-align: right">DÉGÂTS</span><span>BLOCAGE</span><span>PARADE</span><span>ESQUIVE</span><span></span></div>` +
    sheet.attacks.map((a, i) => `<div role="row" style="${grid}; min-height: 52px; padding: 8px 16px; box-sizing: border-box; border-top: 1px solid ${C.lineSoft}; font-size: 14px"><span style="display: flex; flex-direction: column; gap: 3px; min-width: 0"><span>${a.name}</span><span style="${MONO}; font-size: 10px; color: ${C.secondary}; white-space: nowrap">${a.types.map((type, j) => typeIcon(type, 12, j === 0 ? '0 3px 0 0' : '0 3px 0 6px') + TYPES[type][0]).join('')}</span>${under(a, i)}</span><span style="${MONO}; font-size: 12px; color: ${C.secondary}">${KINDS[a.kind]}</span><span style="text-align: right; ${MONO}; font-size: 16px">${a.damage}</span>${word(a.block)}${word(a.parry)}<span style="${MONO}; font-size: 12px; font-weight: 500; color: ${a.dodgeable ? C.ok : C.bad}">${a.dodgeable ? 'ESQUIVABLE' : 'INESQUIVABLE'}</span><span style="display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: ${C.accent}">Simuler${CHEVRON(14, C.accent)}</span></div>`).join('') +
    `</div>`
  const starGroup = stars ? `<div style="display: flex; border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden">${[0, 1, 2].map((s) => `<span style="width: 60px; height: 36px; display: flex; align-items: center; justify-content: center; ${MONO}; font-size: 13px; ${s === 0 ? `background: ${C.accent}; color: ${C.bg}; font-weight: 500` : `color: ${C.secondary}`}">${s}★</span>`).join('')}</div>` : ''
  return `<section style="flex: 1; min-width: 0; overflow: hidden; box-sizing: border-box; padding: 24px 32px 32px"><div style="max-width: 860px; display: flex; flex-direction: column; gap: 24px">` +
    `<div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 16px"><div style="display: flex; flex-direction: column; gap: 4px"><h2 style="margin: 0; font-size: 28px; font-weight: 500">${sheet.name}</h2><span style="${MONO}; font-size: 12px; color: ${C.secondary}">${biomeLine}</span></div>${starGroup}</div>` +
    `<div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px">${deskStat('PV', sheet.health.toLocaleString('fr-FR'))}${sheet.toInflict === null ? deskStat('À INFLIGER', 'Ne titube jamais', 'none') : deskStat('À INFLIGER', sheet.toInflict)}${deskStat('TA PARADE', sheet.parryStaggers ? 'Le fait tituber' : 'Ne le fait pas tituber', sheet.parryStaggers ? 'ok' : 'none')}${deskStat('COMMENT LE PRENDRE', sheet.advice.text, sheet.advice.tone)}</div>` +
    blocks.join('') +
    `<div style="display: flex; flex-direction: column; gap: 8px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">FAIBLESSES ET RÉSISTANCES</span><div style="display: flex; gap: 8px 12px; flex-wrap: wrap; align-items: center; ${MONO}; font-size: 12px">${chips.map(([type, state]) => chip(type, state)).join('')}<span style="font-size: 11px; color: ${C.faint}">${chips.length ? 'Tout le reste ×1' : 'Tout ×1'}</span></div></div>` +
    table + `</div></section>`
}
function deskBestiary({ gear, wet, biome, list, index, current, sheet, height = 900 }) {
  return `<div style="width: 1440px; height: ${height}px; box-sizing: border-box; display: flex; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; overflow: hidden">` +
    sidebar({ gear, wet, biome: biome.name }) +
    `<main style="flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; box-sizing: border-box"><header style="padding: 28px 32px 16px; display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">Bestiaire</h1><p style="margin: 0; font-size: 15px; color: ${C.secondary}">Comment prendre chaque créature avec ton équipement.</p></header>` +
    `<div style="flex: 1; min-height: 0; display: flex; border-top: 1px solid ${C.line}">${deskList(list, { biome: biome.name, index, count: list.length, wet, current })}${sheet}</div></main></div>`
}
// The desktop dialog of Ton équipement, its « Pouvoirs du groupe » swapped for « Du groupe », scrolled to the bottom.
const DESKTOP_GEAR = readFileSync(new URL('Desktop-Equipement.dc.html', OUT), 'utf8')
function deskGear(groupSection) {
  const body = DESKTOP_GEAR.slice(DESKTOP_GEAR.indexOf('<x-dc>') + '<x-dc>'.length, DESKTOP_GEAR.indexOf('</x-dc>'))
  const html = body.slice(body.indexOf('</helmet>') + '</helmet>'.length)
  const start = html.indexOf('<section aria-labelledby="e-group"')
  const end = html.indexOf('</section>', start) + '</section>'.length
  return (html.slice(0, start) + groupSection + html.slice(end))
    .replace('overflow-y: auto; padding: 24px; display: grid;', 'overflow: hidden; padding: 24px; display: grid; align-content: end;')
}
const deskBox = (items) => `<div style="border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden; background: ${C.bg}">${items.join('')}</div>`
const DESK_GROUP = `<section aria-labelledby="e-group" style="flex: none; display: flex; flex-direction: column; gap: 6px; grid-column: 1 / -1">` +
  `<h3 id="e-group" style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 400; letter-spacing: 0.08em; color: ${C.secondary}">DU GROUPE</h3>` +
  deskBox([carryRow({ label: 'POUVOIR', name: 'Pouvoir de Fader', lines: ['5 min · Feu ×0,5', 'tu titubes 2× moins vite'] }), groupBarrier, addRow('Ajouter un pouvoir du groupe', true)]) +
  `<p style="margin: 2px 0 0; font-size: 12px; line-height: 17px; color: ${C.faint}">Ce qu’un joueur lance près de toi&nbsp;; à allumer comme les tiens. La Barrière dépend de la Magie du sang de qui la lance.</p></section>`

const MEADOWS = { name: 'Prairies' }
const PLAINS = { name: 'Plaines' }
const loxCard = card({ open: true, summary: 'Barrière magique', body: rows([...carriedFx, { name: 'Barrière magique', tag: `DU GROUPE · ABSORBE ${BARRIER.capacity} · 1 À 4 MIN`, on: true }]) })
write('Humide-B-Desktop-1', {
  html: deskBestiary({ gear: 'early', wet: true, biome: MEADOWS, list: data.meadows.wet, index: 1, current: 'Eikthyr', sheet: deskSheet(EIK.wet, { biomeLine: 'PRAIRIES · HUMIDE', stars: false }) }),
  width: 1440, height: 900, title: 'Humide et Barrière — B · desktop, Prairies sous la pluie',
})
write('Humide-B-Desktop-2', { html: deskGear(DESK_GROUP), width: 1440, height: 900, title: 'Humide et Barrière — B · desktop, Ton équipement' })
write('Humide-B-Desktop-3', {
  html: deskBestiary({ gear: 'mockups', wet: false, biome: PLAINS, list: data.plains, index: 5, current: 'Lox', sheet: deskSheet(LOX, { biomeLine: 'PLAINES', stars: true, blocks: [loxCard], under: barrierUnder }), height: 1080 }),
  width: 1440, height: 1080, title: 'Humide et Barrière — B · desktop, la Barrière sur le Lox',
})
