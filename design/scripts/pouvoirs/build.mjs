// Writes the « Pouvoirs · pistes » boards (#79) from out/data.json: today's single power, and three tracks for
// carrying several powers at once, as a group shares them; Ton équipement, its list, and the Lox's sheet with its card
// « Avec tes effets temporaires ». Static boards, phones only, the figures from the app's engine (data.mts); Ton
// équipement is the Profil board of Origine, its « Ce que tu emportes » rewritten and shown scrolled to the bottom.
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import * as arsenal from '../arsenal/build.mjs'

const data = JSON.parse(readFileSync(new URL('./out/data.json', import.meta.url), 'utf8'))
const OUT = new URL('../../canvas/project/', import.meta.url)

const C = {
  bg: '#0D1214', surface: '#151C1F', selection: '#1D3344', line: '#2C383D', lineSoft: '#1F2A2E', ink: '#E2E8E8',
  secondary: '#97A5AA', faint: '#7D8B91', accent: '#8EBDE3',
  ok: '#6CC08A', okFill: '#2E7A4B', warn: '#D9A043', warnFill: '#B5760C', bad: '#E36B5E', badFill: '#7A2A24',
}
const MONO = "font-family: 'IBM Plex Mono', monospace"
const TONE = { holds: 'ok', staggered: 'warn', broken: 'bad', unblockable: 'bad' }
const power = Object.fromEntries(data.powers.map((p) => [p.id, p]))
const OWN = 'GP_Bonemass'
const FRIEND = 'GP_Fader'
const OTHER = 'GP_Moder'
const name = (id) => power[id].name
const list = (items) => new Intl.ListFormat('fr', { type: 'conjunction' }).format(items)
const capital = (s) => s.charAt(0).toLocaleUpperCase('fr') + s.slice(1)

const CHEVRON = (size, color) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><path d="M9 6l6 6-6 6"></path></svg>`
const PLUS = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><path d="M12 5v14M5 12h14"></path></svg>`
const BACK = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"></path></svg>`

// ——— Ton équipement ———————————————————————————————————————————————————————————————————————————————————————————

const BROCHE = { label: 'BIBELOT', name: 'Broche en fer', lines: ["30 s dès 65 d'adrénaline · armure +20"] }
const GEL = { label: 'BOISSON', name: 'Hydromel de résistance au gel', lines: ['10 min · Glace ×0,5'] }
const powerRow = (id, label = 'POUVOIR') => ({ label, name: name(id), lines: power[id].lines })

const carryRow = ({ label, name, lines }, last = false) =>
  `<div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px;${last ? '' : ` border-bottom: 1px solid ${C.lineSoft}`}">` +
  `<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>` +
  `<span style="display: flex; align-items: center; gap: 6px"><span style="flex: 1; min-width: 0; font-size: 14px; line-height: 18px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${name}</span>${CHEVRON(14, C.secondary)}</span></span>` +
  `<span style="display: flex; flex-direction: column; ${MONO}; font-size: 12px; line-height: 16px; color: ${C.faint}">${lines.map((l) => `<span style="white-space: nowrap">${l}</span>`).join('')}</span></div>`
const addRow = (text, last = false) =>
  `<span style="display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; box-sizing: border-box; padding: 0 10px; font-size: 14px; line-height: 18px; color: ${C.accent};${last ? '' : ` border-bottom: 1px solid ${C.lineSoft}`}">${PLUS}${text}</span>`
const box = (rows, background = C.surface) => `<div style="border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden; background: ${background}">${rows.join('')}</div>`
const section = (id, title, body, note) =>
  `<section aria-labelledby="${id}" style="flex: none; display: flex; flex-direction: column; gap: 6px">` +
  `<h3 id="${id}" style="margin: 0; font-size: 11px; line-height: 14px; font-weight: 400; letter-spacing: 0.08em; color: ${C.secondary}">${title}</h3>${body}` +
  (note ? `<p style="margin: 2px 0 0; font-size: 12px; line-height: 17px; color: ${C.faint}">${note}</p>` : '') +
  `</section>`
const CARRIED_NOTE = "Pas comptés d'office&nbsp;: allume-les sur la fiche d'une créature ou dans la Simulation, quand ils sont actifs."

// The Profil board of Origine, « Ce que tu emportes » swapped for `sections`, scrolled to the bottom.
const PROFIL = readFileSync(new URL('Profil.dc.html', OUT), 'utf8')
function gearPhone(sections) {
  const start = PROFIL.indexOf('<div role="dialog"')
  const dialog = PROFIL.slice(start, PROFIL.indexOf('</x-dc>'))
  const mainOpen = dialog.indexOf('<main ')
  const innerStart = dialog.indexOf('>', mainOpen) + 1
  const mainClose = dialog.indexOf('</main>')
  let inner = dialog.slice(innerStart, mainClose)
  const carry = inner.indexOf('<section aria-labelledby="q-carry"')
  inner = inner.slice(0, carry) + sections.join('\n')
  const main = `<main style="flex: 1; min-height: 0; position: relative; overflow: hidden"><div style="position: absolute; left: 16px; right: 16px; bottom: 16px; display: flex; flex-direction: column; gap: 18px">${inner}</div></main>`
  return dialog.slice(0, mainOpen) + main + dialog.slice(mainClose + '</main>'.length)
}

// ——— A list of Ton équipement ——————————————————————————————————————————————————————————————————————————————————

// A tag beside a name: what is picked in accent, the rest neutral.
const tagChip = (text, picked) =>
  `<span style="flex: none; ${MONO}; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid ${picked ? C.accent : C.line}; color: ${picked ? C.accent : C.secondary}">${text}</span>`
// `carried`: the row the list stands on, highlighted with its tag; `tag`: a neutral one, for where else it is.
const listRow = (id, { carried = false, carriedTag = 'EMPORTÉ', tag = null } = {}) => {
  // The duration has a line of its own in a list: « 5 MIN », then each change.
  const [first, ...rest] = power[id].lines
  const changes = [first.split(' · ').slice(1).join(' · '), ...rest]
  return `<span style="display: flex; flex-direction: column; gap: 5px; padding: 11px 16px 12px; margin: 0 -16px; border-bottom: 1px solid ${C.lineSoft}; color: ${C.ink};${carried ? ` background: ${C.selection}` : ''}">` +
    `<span style="display: flex; align-items: center; gap: 8px; min-width: 0"><span style="min-width: 0; font-size: 15px">${name(id)}</span>` +
    (carried ? tagChip(carriedTag, true) : '') + (tag ? tagChip(tag, false) : '') +
    `<span style="flex: 1"></span>${CHEVRON(16, C.faint)}</span>` +
    `<span style="${MONO}; font-size: 11px; line-height: 14px; color: ${C.secondary}">5 MIN</span>` +
    `<span style="display: flex; flex-direction: column; font-size: 13px; line-height: 1.45">${changes.map((c) => `<span>${capital(c)}</span>`).join('')}</span></span>`
}
function listPhone({ title, count, search, note, none, rows }) {
  return `<div role="dialog" aria-modal="true" style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 6px 16px 6px 4px; border-bottom: 1px solid ${C.line}"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${BACK}</span>` +
    `<span style="flex: 1; display: flex; flex-direction: column; gap: 1px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.faint}">TON ÉQUIPEMENT</span><h2 style="margin: 0; font-size: 18px; line-height: 22px; font-weight: 500">${title}</h2></span>` +
    `<span style="${MONO}; font-size: 12px; color: ${C.faint}">${count}</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 12px 16px 0; display: flex; flex-direction: column; gap: 10px">` +
    `<span style="flex: none; display: flex; align-items: center; gap: 8px; height: 44px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; padding: 0 12px; font-size: 15px; color: ${C.faint}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${C.faint}" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" style="flex: none"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-4-4"></path></svg>${search}</span>` +
    `<span style="flex: none; font-size: 12px; line-height: 1.35; color: ${C.secondary}">${note}</span>` +
    `<div style="flex: 1; min-height: 0; overflow: hidden; display: flex; flex-direction: column; margin: 0 -16px; padding: 0 16px; border-top: 1px solid ${C.line}">` +
    (none ? `<span style="display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 0 16px; margin: 0 -16px; border-bottom: 1px solid ${C.lineSoft}"><span style="flex: 1; font-size: 15px">${none[0]}</span><span style="font-size: 12px; color: ${C.faint}">${none[1]}</span></span>` : '') +
    rows.join('') + `</div></main></div>`
}

// ——— The Lox's sheet ———————————————————————————————————————————————————————————————————————————————————————————

const SWITCH = (on) =>
  `<span aria-hidden="true" style="flex: none; width: 44px; height: 44px; margin: -4px 0; display: flex; align-items: center; justify-content: center"><span style="position: relative; width: 38px; height: 22px; box-sizing: border-box; border: 1px solid ${on ? C.accent : C.faint}; border-radius: 12px; background: ${on ? C.accent : C.line}"><span style="position: absolute; top: 1px; left: ${on ? '17px' : '1px'}; width: 18px; height: 18px; border-radius: 50%; background: ${on ? C.bg : C.secondary}"></span></span></span>`
// A row of the card: a name, its kind and duration, and a switch, or why it changes nothing.
const fxRow = ({ name, tag, on = false, idle = null }, first) =>
  `<div style="display: flex; align-items: center; gap: 12px; padding: 8px 0;${first ? '' : ` border-top: 1px solid ${C.lineSoft}`}">` +
  `<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px; line-height: 18px; color: ${idle ? C.secondary : C.ink}">${name}</span>` +
  `<span style="${MONO}; font-size: 10px; line-height: 13px; letter-spacing: 0.04em; color: ${C.faint}">${tag}</span>` +
  (idle ? `<span style="font-size: 12px; line-height: 16px; color: ${C.faint}">${idle}</span>` : '') +
  `</div>${idle && !on ? '' : SWITCH(on)}</div>`
const subhead = (text) =>
  `<div style="padding: 12px 0 2px; border-top: 1px solid ${C.lineSoft}; font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">${text}</div>`
const muteLine = (text) =>
  `<div style="padding: 8px 0; border-top: 1px solid ${C.lineSoft}; font-size: 12px; line-height: 16px; color: ${C.faint}">${text}</div>`
function card({ open, summary, body }) {
  const chevron = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${C.secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; transform: ${open ? 'rotate(180deg)' : 'none'}"><path d="M6 9l6 6 6-6"></path></svg>`
  return `<div style="flex: none; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.surface}">` +
    `<div style="display: flex; align-items: center; gap: 12px; min-height: 56px; box-sizing: border-box; padding: 8px 12px"><span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; line-height: 20px">Avec tes effets temporaires</span><span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">${summary}</span></span>${chevron}</div>` +
    (open ? `<div style="padding: 0 12px; border-top: 1px solid ${C.lineSoft}">${body}<p style="margin: 0; padding: 8px 0 10px; border-top: 1px solid ${C.lineSoft}; font-size: 12px; line-height: 16px; color: ${C.faint}">Vaut jusqu'à ce que tu changes de créature.</p></div>` : '') +
    `</div>`
}
const ICONS = {
  blunt: 'M13 3l8 8-4 4-8-8zM13 11l-9 9',
  slash: 'M4 14L14 4M7 19L19 7M13 20l7-7',
  fire: 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z',
  frost: 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9',
  spirit: 'M6 20V11a6 6 0 0 1 12 0v9l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5zM10 11h.01M14 11h.01',
}
const TYPE_WORD = { blunt: 'CONTONDANT', slash: 'COUPANT', fire: 'FEU', frost: 'GLACE', spirit: 'ESPRIT' }
const icon = (type, size = 12, margin = '0 5px 0 0') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="${size}" height="${size}" style="vertical-align: -2px; margin: ${margin}"><path d="${ICONS[type]}"></path></svg>`
const chip = (type, word, weak, immune) =>
  `<span style="padding: 3px 8px; border-radius: 3px; border: 1px ${immune ? 'dashed' : 'solid'} ${weak ? C.secondary : C.line}; color: ${weak ? C.ink : immune ? C.faint : C.secondary}">${icon(type)}${TYPE_WORD[type]} · <span style="font-weight: 500">${word}</span></span>`
const RESISTANCES = `<div style="flex: none; display: flex; flex-direction: column; gap: 6px"><span style="font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">FAIBLESSES ET RÉSISTANCES</span>` +
  `<div style="display: flex; gap: 6px 8px; flex-wrap: wrap; align-items: center; ${MONO}; font-size: 12px">${chip('fire', 'FAIBLE ×1,5', true)}${chip('blunt', 'RÉSISTANT ×0,5')}${chip('slash', 'RÉSISTANT ×0,5')}${chip('frost', 'RÉSISTANT ×0,5')}${chip('spirit', 'IMMUNISÉ ×0', false, true)}<span style="font-size: 11px; color: ${C.faint}">Tout le reste ×1</span></div></div>`
const SHIELD = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path>'
const PARRY = SHIELD + '<path d="M13 7.5l-3 4.5h4l-3 4.5"></path>'
const DODGE = '<path d="M4 16a8 8 0 0 1 14.5-6.5"></path><path d="M19 4.5v5h-5"></path><path d="M3 20h8"></path>'
const verdictBox = (verdict, paths) => {
  const tone = TONE[verdict] ?? 'ok'
  return `<span style="width: 28px; height: 28px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${C[`${tone}Fill`]}; color: ${C[tone]}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`
}
const KINDS = { melee: 'MÊLÉE', area: 'ZONE' }
const head = (paths, label) => `<span style="width: 28px; display: flex; justify-content: center"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="${label}">${paths}</svg></span>`
function attacks(sheet) {
  const grid = 'display: grid; grid-template-columns: minmax(0, 1fr) 40px 96px 16px; gap: 8px; align-items: center'
  return `<section style="flex: none; display: flex; flex-direction: column"><div style="${grid}; padding-bottom: 6px; border-bottom: 1px solid ${C.line}; font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}"><h2 style="margin: 0; font-size: 10px; font-weight: 400">SES ATTAQUES</h2><span style="text-align: right">DÉG.</span><span style="display: flex; gap: 4px">${head(SHIELD, 'Blocage')}${head(PARRY, 'Parade')}${head(DODGE, 'Esquive')}</span><span></span></div>` +
    sheet.attacks.map((a) => `<div style="${grid}; min-height: 56px; border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 14px">${a.name}</span><span style="${MONO}; font-size: 10px; color: ${C.secondary}; white-space: nowrap">${icon(a.types[0], 12, '0 3px 0 0')}${TYPE_WORD[a.types[0]]} · ${KINDS[a.kind]}</span></span><span style="text-align: right; ${MONO}; font-size: 15px">${a.damage}</span><span aria-hidden="true" style="display: flex; gap: 4px">${verdictBox(a.block, SHIELD)}${verdictBox(a.parry, PARRY)}${verdictBox('holds', DODGE)}</span>${CHEVRON(16, C.faint)}</div>`).join('') +
    `</section>`
}
const ADVICE_ICON = {
  ok: '<path d="M5 12l5 5L20 7"></path>',
  warn: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
}
const stat = (label, value, tone) =>
  `<div style="background: ${C.surface}; padding: 10px; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>${tone ? `<span style="font-size: 13px; color: ${C[tone]}; padding-top: 3px">${value}</span>` : `<span style="${MONO}; font-size: 18px">${value}</span>`}</div>`
function sheetPhone(sheet, cardHtml) {
  const tone = sheet.advice.tone
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${BACK}</span><h1 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">${data.lox.name}</h1><span style="${MONO}; font-size: 11px; color: ${C.secondary}">PLAINES</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 14px; overflow: hidden">` +
    `<div style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: ${C.line}; border: 1px solid ${C.line}; border-radius: 6px; overflow: hidden">${stat('PV', data.lox.health.toLocaleString('fr-FR'))}${stat('À INFLIGER', '300')}${stat('TA PARADE', 'Le fait tituber', 'ok')}</div>` +
    `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${C[tone]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ADVICE_ICON[tone]}</svg><span>${sheet.advice.text}</span></div>` +
    cardHtml + RESISTANCES + attacks(sheet) + `</main></div>`
}

// ——— Boards ————————————————————————————————————————————————————————————————————————————————————————————————————

const GEAR_LINE = `Bouclier en argent N3, Blocage 25, pièces en fer N1 et cape de loup N3 (armure ${data.armor}), 150 PV · combat normal, 1 joueur : tes amis ont lancé leur pouvoir à côté de toi, puis sont partis à plus de 100 m · ${name(OWN)} est ton pouvoir, ${name(FRIEND)} celui d'un ami, ${name(OTHER)} celui d'un autre · chiffres du moteur de l'app.`
function board(title, heading, desc, proscons, phones) {
  const cols = phones.map(([label, html, caption]) => `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span><div style="border-radius: 2px; overflow: hidden">${html}</div>${caption ? `<span style="font-size: 12px; line-height: 1.45; color: ${C.faint}">${caption}</span>` : ''}</div>`).join('')
  const width = 40 * 2 + 390 * phones.length + 32 * (phones.length - 1)
  const html = `<div style="width: ${width}px; height: 1240px; box-sizing: border-box; padding: 40px; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 28px"><header style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">${heading}</h1><p style="margin: 0; max-width: 1500px; font-size: 15px; line-height: 1.5; color: ${C.secondary}">${desc}</p>${proscons ? `<p style="margin: 0; max-width: 1500px; font-size: 13px; line-height: 1.5; color: ${C.faint}">${proscons}</p>` : ''}<p style="margin: 0; max-width: 1500px; font-size: 12px; line-height: 1.5; color: ${C.faint}">${GEAR_LINE}</p></header><div style="display: flex; gap: 32px; align-items: flex-start">${cols}</div></div>`
  return { html, width, height: 1240, title }
}
// `logic`: the body of the board's Component, for a board that answers in Play.
function write(name, { html, width, height, title }, logic = `  renderVals() {
    return {};
  }`) {
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
${logic}
}
</script>
</body>
</html>
`
  writeFileSync(new URL(`${name}.dc.html`, OUT), page, 'utf8')
  console.log(name, width, height)
}

const S = data.sheets
const idle = (sheet, id) => sheet.idle[id]
const TAG = 'POUVOIR · 5 MIN'
const GROUP_TAG = 'POUVOIR DU GROUPE · 5 MIN'
const brocheFx = { name: 'Broche en fer', tag: "BIBELOT · 30 S DÈS 65 D'ADRÉNALINE" }
const gelFx = { name: 'Hydromel de résistance au gel', tag: 'BOISSON · 10 MIN', idle: 'Ne change rien : pas de glace' }
const fxPower = (sheet, id, tag = TAG) => ({ name: name(id), tag, on: sheet.on.includes(id), idle: idle(sheet, id)?.replace(' : ', ' : ') ?? null })
const rows = (items) => items.map((item, i) => fxRow(item, i === 0)).join('')
const summaryOf = (sheet) => (sheet.on.length === 0 ? 'Aucun allumé' : list(sheet.on.map(name)))
const OTHERS = ['GP_Eikthyr', 'GP_TheElder', 'GP_Yagluth', 'GP_Queen']

// Today: one power, which the list swaps.
write('Pouvoirs-Auj', board(
  'Pouvoirs — aujourd’hui',
  'Aujourd’hui · un seul pouvoir',
  `Ton équipement n’emporte qu’un pouvoir : en choisir un autre remplace le tien. Contre le Lox, ton ${name(OWN)} ne fait pas tenir ton blocage sur la Morsure ; le ${name(FRIEND)} qu’un ami lance à côté de toi le ferait, mais l’app ne peut pas les compter ensemble.`,
  '',
  [
    ['TON ÉQUIPEMENT · CE QUE TU EMPORTES', gearPhone([section('q-carry', 'CE QUE TU EMPORTES', box([carryRow(BROCHE), carryRow(powerRow(OWN)), carryRow(GEL), addRow('Ajouter une boisson', true)]), CARRIED_NOTE)])],
    ['TON POUVOIR · UN SEUL À LA FOIS', listPhone({
      title: 'Ton pouvoir', count: '7 pouvoirs', search: 'Chercher un pouvoir',
      note: 'Un seul à la fois&nbsp;: celui que tu choisis remplace le tien.',
      none: ['Aucun pouvoir', 'retire celui que tu emportes'],
      rows: ['GP_Eikthyr', 'GP_TheElder', OWN, OTHER, 'GP_Yagluth', 'GP_Queen', FRIEND].map((id) => listRow(id, { carried: id === OWN })),
    })],
    ['LOX · AVEC TES EFFETS TEMPORAIRES', sheetPhone(S.own, card({ open: true, summary: summaryOf(S.own), body: rows([brocheFx, fxPower(S.own, OWN), gelFx]) })), `Ton ${name(OWN)} allumé ne change pas le conseil : la Morsure bloquée te fait toujours tituber.`],
  ],
))

// A: powers like drinks, as many as one likes, each once; nothing says whose.
const aGear = gearPhone([section('q-carry', 'CE QUE TU EMPORTES', box([carryRow(BROCHE), carryRow(powerRow(OWN)), carryRow(powerRow(FRIEND)), carryRow(powerRow(OTHER)), addRow('Ajouter un pouvoir'), carryRow(GEL), addRow('Ajouter une boisson', true)]), CARRIED_NOTE)])
const aFx = (sheet) => rows([brocheFx, fxPower(sheet, OWN), fxPower(sheet, FRIEND), fxPower(sheet, OTHER), gelFx])
write('Pouvoirs-A', board(
  'Pouvoirs — piste A',
  'A · Des pouvoirs, comme les boissons',
  'Ton équipement emporte autant de pouvoirs que tu veux, chacun une fois, comme les boissons : « Ajouter un pouvoir » ouvre ceux qui manquent, toucher un pouvoir emporté l’échange ou le retire. Rien ne dit d’où il vient. Sur la fiche et dans la Simulation, une ligne et un interrupteur par pouvoir.',
  'Pour : rien de nouveau à apprendre, la liste marche comme celle des boissons. Contre : « emporter » le pouvoir d’un ami se lit mal, et rien ne rappelle que le tien est unique.',
  [
    ['TON ÉQUIPEMENT · TROIS POUVOIRS', aGear],
    ['UN POUVOIR DE PLUS', listPhone({
      title: 'Un pouvoir de plus', count: '4 sur 7', search: 'Chercher un pouvoir',
      note: `Tes ${list([name(OWN), name(FRIEND), name(OTHER)])} sont déjà emportés&nbsp;: un pouvoir ne compte qu’une fois.`,
      rows: OTHERS.map((id) => listRow(id)),
    }), 'Seuls ceux qui ne sont pas encore emportés. Toucher un pouvoir emporté ouvre « Ton pouvoir » : en choisir un autre, ou « Retirer ce pouvoir ».'],
    ['LOX · DEUX ALLUMÉS', sheetPhone(S.two, card({ open: true, summary: summaryOf(S.two), body: aFx(S.two) })), `Avec le ${name(FRIEND)}, ton blocage tient sur la Morsure. ${name(OTHER)} est grisé : le Lox ne fait pas de glace.`],
    ['LOX · REPLIÉ', sheetPhone(S.two, card({ open: false, summary: summaryOf(S.two) })), 'Replié, la carte nomme ce qui est allumé ; les verdicts le comptent.'],
  ],
))

// B: one's own power, one, as the game has it; the group's apart.
const bGear = gearPhone([
  section('q-carry', 'CE QUE TU EMPORTES', box([carryRow(BROCHE), carryRow(powerRow(OWN, 'TON POUVOIR')), carryRow(GEL), addRow('Ajouter une boisson', true)])),
  section('q-group', 'POUVOIRS DU GROUPE', box([carryRow(powerRow(FRIEND, 'POUVOIR')), carryRow(powerRow(OTHER, 'POUVOIR')), addRow('Ajouter un pouvoir du groupe', true)]), `Ceux qu’un joueur lance à moins de 10 m de toi. ${CARRIED_NOTE}`),
])
const bFx = (sheet) => rows([brocheFx, fxPower(sheet, OWN), fxPower(sheet, FRIEND, GROUP_TAG), fxPower(sheet, OTHER, GROUP_TAG), gelFx])
write('Pouvoirs-B', board(
  'Pouvoirs — piste B',
  'B · Le tien, et ceux du groupe',
  'Ton équipement garde ton pouvoir, un seul, comme le jeu. Une section « Pouvoirs du groupe » en ajoute d’autres : ceux qu’un joueur lance à moins de 10 m de toi. Sur la fiche et dans la Simulation, ils suivent le tien, marqués « du groupe ».',
  'Pour : colle au jeu (un pouvoir à soi, les autres reçus) et dit d’où vient chacun. Contre : une section de plus dans Ton équipement, pour ce qui change d’une partie à l’autre.',
  [
    ['TON ÉQUIPEMENT · LE TIEN, PUIS LE GROUPE', bGear],
    ['UN POUVOIR DU GROUPE', listPhone({
      title: 'Un pouvoir du groupe', count: '4 sur 6', search: 'Chercher un pouvoir',
      note: `Sans le tien (${name(OWN)}), ni ceux déjà ajoutés&nbsp;: ${list([name(FRIEND), name(OTHER)])}.`,
      rows: OTHERS.map((id) => listRow(id)),
    }), 'Seuls ceux qui ne sont ni le tien, ni déjà ajoutés. Toucher un pouvoir du groupe l’échange ou le retire.'],
    ['LOX · DEUX ALLUMÉS', sheetPhone(S.two, card({ open: true, summary: summaryOf(S.two), body: bFx(S.two) })), `Le tien d’abord, puis ceux du groupe. Avec le ${name(FRIEND)}, ton blocage tient sur la Morsure.`],
    ['LOX · REPLIÉ', sheetPhone(S.two, card({ open: false, summary: summaryOf(S.two) })), 'Replié, rien ne change : la carte nomme ce qui est allumé.'],
  ],
))

// C: the group's on the card only, nothing declared nor kept.
const groupIds = data.powers.map((p) => p.id).filter((id) => id !== OWN)
const cFx = (sheet) => {
  const useful = groupIds.filter((id) => idle(sheet, id) === null)
  const idleNames = groupIds.filter((id) => idle(sheet, id) !== null).map(name)
  return rows([brocheFx, fxPower(sheet, OWN), gelFx]) + subhead('DU GROUPE') +
    useful.map((id) => fxRow({ name: name(id), tag: TAG, on: sheet.on.includes(id) }, true)).join('') +
    muteLine(`Ne changent rien ici&nbsp;: ${list(idleNames)}.`)
}
write('Pouvoirs-C', board(
  'Pouvoirs — piste C',
  'C · Ceux du groupe, sur la fiche',
  'Ton équipement ne change pas : ton pouvoir, un seul. Ceux du groupe ne se déclarent nulle part : la carte « Avec tes effets temporaires » de la fiche et de la Simulation les propose tous sous « Du groupe », un interrupteur pour ceux qui changent quelque chose contre cette créature, les autres nommés sur une ligne. Comme le reste de la carte, rien n’est gardé d’une créature à l’autre.',
  'Pour : rien à préparer, tu allumes le pouvoir d’un ami quand il le lance. Contre : une section de plus dans chaque carte, même en solo, et à rallumer à chaque créature.',
  [
    ['LOX · RIEN D’ALLUMÉ', sheetPhone(S.none, card({ open: true, summary: summaryOf(S.none), body: cFx(S.none) })), `« Du groupe » ne garde que ce qui change un coup contre le Lox : le ${name(FRIEND)}.`],
    ['LOX · LE TIEN ET CELUI DE FADER', sheetPhone(S.two, card({ open: true, summary: summaryOf(S.two), body: cFx(S.two) })), `Avec le ${name(FRIEND)}, ton blocage tient sur la Morsure.`],
    ['LOX · REPLIÉ', sheetPhone(S.two, card({ open: false, summary: summaryOf(S.two) }))],
    ['TON ÉQUIPEMENT · INCHANGÉ', gearPhone([section('q-carry', 'CE QUE TU EMPORTES', box([carryRow(BROCHE), carryRow(powerRow(OWN)), carryRow(GEL), addRow('Ajouter une boisson', true)]), CARRIED_NOTE)]), 'Comme aujourd’hui : ton pouvoir seul. Ceux du groupe ne s’y ajoutent pas.'],
  ],
))

// ——— Iteration 1 of track B, the owner's pick ————————————————————————————————————————————————————————————————————

const BROCHE_ID = 'TrinketIronHealth'
const GEL_ID = 'Potion_frostresist'
const SWITCHED = [BROCHE_ID, OWN, FRIEND]
const GROUP_NOTE = 'Ceux qu’un joueur lance à moins de 10 m de toi&nbsp;; à allumer comme les tiens.'
const b1GearSections = (background) => [
  section('q-carry', 'CE QUE TU EMPORTES', box([carryRow(BROCHE), carryRow(powerRow(OWN)), carryRow(GEL), addRow('Ajouter une boisson', true)], background), CARRIED_NOTE),
  section('q-group', 'POUVOIRS DU GROUPE', box([carryRow(powerRow(FRIEND)), carryRow(powerRow(OTHER)), addRow('Ajouter un pouvoir du groupe', true)], background), GROUP_NOTE),
]

// The Lox's sheet whose card answers in Play: its switches change the advice and the verdicts, as the engine has them.
const LIVE_ROWS = [
  { id: BROCHE_ID, name: 'Broche en fer', tag: "BIBELOT · 30 S DÈS 65 D'ADRÉNALINE" },
  { id: OWN, name: name(OWN), tag: TAG },
  { id: GEL_ID, name: 'Hydromel de résistance au gel', tag: 'BOISSON · 10 MIN' },
  { id: FRIEND, name: name(FRIEND), tag: GROUP_TAG },
  { id: OTHER, name: name(OTHER), tag: GROUP_TAG },
]
const LIVE_STATES = Object.fromEntries(Object.entries(data.states).map(([key, sheet]) => [key, {
  tone: sheet.advice.tone,
  text: sheet.advice.text,
  verdicts: sheet.attacks.map((a) => [a.block, a.parry]),
  idle: Object.fromEntries(LIVE_ROWS.map((r) => [r.id, sheet.idle[r.id]?.replace(' : ', ' : ') ?? null])),
}]))
const LIVE_ATTACKS = S.none.attacks.map((a) => ({ name: a.name, damage: a.damage, typeWord: TYPE_WORD[a.types[0]], typeIcon: ICONS[a.types[0]], kind: KINDS[a.kind] }))
const liveLogic = `  constructor(props) {
    super(props);
    this.state = { on: [], open: true };
  }
  renderVals() {
    const ROWS = ${JSON.stringify(LIVE_ROWS)};
    const STATES = ${JSON.stringify(LIVE_STATES)};
    const ATTACKS = ${JSON.stringify(LIVE_ATTACKS)};
    const SWITCHED = ${JSON.stringify(SWITCHED)};
    const TONES = { ok: ['${C.ok}', '${C.okFill}'], warn: ['${C.warn}', '${C.warnFill}'], bad: ['${C.bad}', '${C.badFill}'] };
    const TONE_OF = { holds: 'ok', staggered: 'warn', broken: 'bad', unblockable: 'bad' };
    const on = this.state.on;
    const open = this.state.open;
    const sheet = STATES[SWITCHED.filter((id) => on.indexOf(id) !== -1).join('+')];
    const names = ROWS.filter((r) => on.indexOf(r.id) !== -1).map((r) => r.name);
    const verdict = (v) => TONES[TONE_OF[v]];
    return {
      adv: { color: TONES[sheet.tone][0], isOk: sheet.tone === 'ok', isWarn: sheet.tone === 'warn', text: sheet.text },
      fx: {
        open: open,
        expanded: String(open),
        chevron: open ? 'rotate(180deg)' : 'none',
        fold: () => this.setState({ open: !open }),
        summary: names.length === 0 ? 'Aucun allumé' : names.length === 1 ? names[0] : names.slice(0, -1).join(', ') + ' et ' + names[names.length - 1],
        rows: ROWS.map((r, i) => {
          const lit = on.indexOf(r.id) !== -1;
          const why = sheet.idle[r.id];
          return {
            id: 'b1-fx-' + i,
            tagId: 'b1-fx-' + i + '-tag',
            noteId: 'b1-fx-' + i + '-note',
            name: r.name,
            tag: r.tag,
            nameColor: why ? '${C.secondary}' : '${C.ink}',
            hasNote: Boolean(why),
            note: why || '',
            describedBy: 'b1-fx-' + i + '-tag' + (why ? ' b1-fx-' + i + '-note' : ''),
            divider: i === 0 ? 'none' : '1px solid ${C.lineSoft}',
            // What changes nothing against this creature has no switch, unless it is on.
            switchable: !why || lit,
            checked: String(lit),
            track: lit ? '${C.accent}' : '${C.line}',
            trackBorder: lit ? '${C.accent}' : '${C.faint}',
            knob: lit ? '17px' : '1px',
            knobColor: lit ? '${C.bg}' : '${C.secondary}',
            toggle: () => this.setState({ on: lit ? on.filter((id) => id !== r.id) : on.concat([r.id]) })
          };
        })
      },
      attacks: ATTACKS.map((a, i) => {
        const b = verdict(sheet.verdicts[i][0]);
        const p = verdict(sheet.verdicts[i][1]);
        return { name: a.name, damage: a.damage, typeWord: a.typeWord, typeIcon: a.typeIcon, kind: a.kind, bColor: b[0], bBorder: b[1], pColor: p[0], pBorder: p[1] };
      })
    };
  }`
function liveSheetPhone() {
  const grid = 'display: grid; grid-template-columns: minmax(0, 1fr) 40px 96px 16px; gap: 8px; align-items: center'
  const box = (border, color, paths) => `<span style="width: 28px; height: 28px; box-sizing: border-box; border-radius: 4px; display: flex; align-items: center; justify-content: center; border: 1px solid ${border}; color: ${color}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></span>`
  const chevronDown = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${C.secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; transition: transform 0.15s; transform: {{ fx.chevron }}"><path d="M6 9l6 6 6-6"></path></svg>`
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${BACK}</span><h1 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">${data.lox.name}</h1><span style="${MONO}; font-size: 11px; color: ${C.secondary}">PLAINES</span></header>` +
    `<main style="flex: 1; min-height: 0; padding: 4px 16px 12px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto">` +
    `<div style="flex: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: ${C.line}; border: 1px solid ${C.line}; border-radius: 6px; overflow: hidden">${stat('PV', data.lox.health.toLocaleString('fr-FR'))}${stat('À INFLIGER', '300')}${stat('TA PARADE', 'Le fait tituber', 'ok')}</div>` +
    `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 14px; color: {{ adv.color }}">` +
    `<sc-if value="{{ adv.isOk }}" hint-placeholder-val="{{ false }}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ADVICE_ICON.ok}</svg></sc-if>` +
    `<sc-if value="{{ adv.isWarn }}" hint-placeholder-val="{{ true }}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ADVICE_ICON.warn}</svg></sc-if>` +
    `<span>{{ adv.text }}</span></div>` +
    `<div style="flex: none; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.surface}">` +
    `<button type="button" onClick="{{ fx.fold }}" aria-expanded="{{ fx.expanded }}" aria-controls="b1-fx" style="display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; box-sizing: border-box; padding: 8px 12px; text-align: left"><span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; line-height: 20px; color: ${C.ink}">Avec tes effets temporaires</span><span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">{{ fx.summary }}</span></span>${chevronDown}</button>` +
    `<sc-if value="{{ fx.open }}" hint-placeholder-val="{{ true }}"><div id="b1-fx" role="group" aria-label="Tes effets temporaires" style="padding: 0 12px; border-top: 1px solid ${C.lineSoft}">` +
    `<sc-for list="{{ fx.rows }}" as="r" hint-placeholder-count="5"><div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: {{ r.divider }}">` +
    `<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span id="{{ r.id }}" style="font-size: 14px; line-height: 18px; color: {{ r.nameColor }}">{{ r.name }}</span><span id="{{ r.tagId }}" style="${MONO}; font-size: 10px; line-height: 13px; letter-spacing: 0.04em; color: ${C.faint}">{{ r.tag }}</span>` +
    `<sc-if value="{{ r.hasNote }}" hint-placeholder-val="{{ false }}"><span id="{{ r.noteId }}" style="font-size: 12px; line-height: 16px; color: ${C.faint}">{{ r.note }}</span></sc-if></div>` +
    `<sc-if value="{{ r.switchable }}" hint-placeholder-val="{{ true }}"><button type="button" role="switch" aria-checked="{{ r.checked }}" aria-labelledby="{{ r.id }}" aria-describedby="{{ r.describedBy }}" onClick="{{ r.toggle }}" style="flex: none; width: 44px; height: 44px; margin: -4px 0; display: flex; align-items: center; justify-content: center"><span aria-hidden="true" style="position: relative; width: 38px; height: 22px; box-sizing: border-box; border: 1px solid {{ r.trackBorder }}; border-radius: 12px; background: {{ r.track }}; transition: background 0.15s, border-color 0.15s"><span style="position: absolute; top: 1px; left: {{ r.knob }}; width: 18px; height: 18px; border-radius: 50%; background: {{ r.knobColor }}; transition: left 0.15s"></span></span></button></sc-if>` +
    `</div></sc-for>` +
    `<p style="margin: 0; padding: 8px 0 10px; border-top: 1px solid ${C.lineSoft}; font-size: 12px; line-height: 16px; color: ${C.faint}">Vaut jusqu'à ce que tu changes de créature.</p></div></sc-if></div>` +
    RESISTANCES +
    `<section style="flex: none; display: flex; flex-direction: column"><div style="${grid}; padding-bottom: 6px; border-bottom: 1px solid ${C.line}; font-size: 10px; letter-spacing: 0.08em; color: ${C.secondary}"><h2 style="margin: 0; font-size: 10px; font-weight: 400">SES ATTAQUES</h2><span style="text-align: right">DÉG.</span><span style="display: flex; gap: 4px">${head(SHIELD, 'Blocage')}${head(PARRY, 'Parade')}${head(DODGE, 'Esquive')}</span><span></span></div>` +
    `<sc-for list="{{ attacks }}" as="a" hint-placeholder-count="2"><div style="${grid}; min-height: 56px; border-bottom: 1px solid ${C.lineSoft}"><span style="display: flex; flex-direction: column; gap: 2px; min-width: 0"><span style="font-size: 14px">{{ a.name }}</span><span style="${MONO}; font-size: 10px; color: ${C.secondary}; white-space: nowrap"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="12" height="12" style="vertical-align: -2px; margin-right: 3px"><path d="{{ a.typeIcon }}"></path></svg>{{ a.typeWord }} · {{ a.kind }}</span></span><span style="text-align: right; ${MONO}; font-size: 15px">{{ a.damage }}</span>` +
    `<span aria-hidden="true" style="display: flex; gap: 4px">${box('{{ a.bBorder }}', '{{ a.bColor }}', SHIELD)}${box('{{ a.pBorder }}', '{{ a.pColor }}', PARRY)}${box(C.okFill, C.ok, DODGE)}</span>${CHEVRON(16, C.faint)}</div></sc-for></section>` +
    `</main></div>`
}

const groupIdsB1 = [FRIEND, OTHER]
write('Pouvoirs-B1', board(
  'Pouvoirs — itération 1 de B',
  'Itération 1 · B, le tien et ceux du groupe',
  'Ton équipement garde « Ce que tu emportes » tel quel, ton pouvoir compris ; « Pouvoirs du groupe » vient dessous. Un pouvoir ne compte qu’une fois : la liste du groupe écarte le tien et ceux déjà ajoutés, et choisir comme le tien un pouvoir du groupe l’en retire. Sur la fiche et dans la Simulation, la carte suit l’ordre de Ton équipement, puis ceux du groupe. Allume la Broche, Masse-d’Os ou le Pouvoir de Fader en Play : le conseil et les verdicts suivent le moteur.',
  'Mes arbitrages : la première arrivée ne montre pas « Pouvoirs du groupe » (elle demande ton équipement) ; Ton monde ne bouge pas. Sur tes retours : dans l’Arsenal, ton pouvoir est ÉQUIPÉ (« Équiper » en fait le tien) et ceux du groupe DU GROUPE ; quand ce qui est allumé fait déjà ce qu’une ligne ferait, la raison dit « déjà couvert par… » (ta cape, ton pouvoir, le Pouvoir de Fader).',
  [
    ['TON ÉQUIPEMENT · LE TIEN, PUIS LE GROUPE', gearPhone(b1GearSections()), 'Sans pouvoir du groupe, la section ne garde que « Ajouter un pouvoir du groupe ».'],
    ['AJOUTER UN POUVOIR DU GROUPE', listPhone({
      title: 'Un pouvoir du groupe', count: '4 sur 7', search: 'Chercher un pouvoir',
      note: `Déjà là&nbsp;: ${name(OWN)} (le tien), ${list(groupIdsB1.map(name))}. Un pouvoir ne compte qu’une fois.`,
      rows: OTHERS.map((id) => listRow(id)),
    }), 'Ceux qui ne sont ni le tien, ni déjà dans le groupe.'],
    ['TOUCHER UN POUVOIR DU GROUPE', listPhone({
      title: 'Pouvoir du groupe', count: '5 sur 7', search: 'Chercher un pouvoir',
      note: `Choisis-en un autre pour remplacer le ${name(FRIEND)}, ou retire-le.`,
      none: ['Retirer ce pouvoir', ''],
      rows: ['GP_Eikthyr', 'GP_TheElder', 'GP_Yagluth', 'GP_Queen', FRIEND].map((id) => listRow(id, { carried: id === FRIEND, carriedTag: 'DU GROUPE' })),
    }), 'Comme une boisson emportée : l’échanger, ou le retirer.'],
    ['TON POUVOIR', listPhone({
      title: 'Ton pouvoir', count: '7 pouvoirs', search: 'Chercher un pouvoir',
      note: 'Un seul à la fois&nbsp;: celui que tu choisis remplace le tien.',
      none: ['Aucun pouvoir', 'retire le tien'],
      rows: ['GP_Eikthyr', 'GP_TheElder', OWN, OTHER, 'GP_Yagluth', 'GP_Queen', FRIEND].map((id) => listRow(id, { carried: id === OWN, carriedTag: 'ÉQUIPÉ', tag: groupIdsB1.includes(id) ? 'DU GROUPE' : null })),
    }), `Choisir ${name(OTHER)} ou le ${name(FRIEND)} comme le tien le retire du groupe.`],
    ['LOX · EN PLAY', liveSheetPhone(), 'Rien d’allumé à l’arrivée. Masse-d’Os seul : tu titubes encore en bloquant la Morsure ; avec la Broche ou le Pouvoir de Fader, tout tient. Moder et l’hydromel : pas de glace.'],
  ],
), liveLogic)

// The desktop dialog of Ton équipement, from Desktop-Equipement, its « Ce que tu emportes » followed by the group's,
// shown scrolled to the bottom.
const DESKTOP_GEAR = readFileSync(new URL('Desktop-Equipement.dc.html', OUT), 'utf8')
function desktopGear() {
  const body = DESKTOP_GEAR.slice(DESKTOP_GEAR.indexOf('<x-dc>') + '<x-dc>'.length, DESKTOP_GEAR.indexOf('</x-dc>'))
  const html = body.slice(body.indexOf('</helmet>') + '</helmet>'.length)
  const start = html.indexOf('<section aria-labelledby="e-carry"')
  const end = html.indexOf('</section>', start) + '</section>'.length
  const wide = (s) => s.replace('style="flex: none; display: flex; flex-direction: column; gap: 6px"', 'style="flex: none; display: flex; flex-direction: column; gap: 6px; grid-column: 1 / -1"')
  const sections = b1GearSections(C.bg).map(wide).join('\n')
  return (html.slice(0, start) + sections + html.slice(end))
    .replace('overflow-y: auto; padding: 24px; display: grid;', 'overflow: hidden; padding: 24px; display: grid; align-content: end;')
}
write('Pouvoirs-B1-Desktop', { html: desktopGear(), width: 1440, height: 900, title: 'Pouvoirs — itération 1 de B · desktop' })

// ——— The owner's feedback on iteration 1 ————————————————————————————————————————————————————————————————————————

// The Arsenal's powers: one's own ÉQUIPÉ (and « Équiper » to make one yours), the group's tagged DU GROUPE, in that
// order at the head of the list.
const groupChip = tagChip('DU GROUPE', false)
const powersFirst = (list) => [OWN, FRIEND, OTHER].map((id) => list.find((e) => e.id === id)).concat(list.filter((e) => ![OWN, FRIEND, OTHER].includes(e.id)))
arsenal.data.effects.power = powersFirst(arsenal.data.effects.power)
const markGroup = (html, between) =>
  [FRIEND, OTHER].reduce((out, id) => out
    .replace(`aria-label="${name(id)}. Ouvrir`, `aria-label="${name(id)}, du groupe. Ouvrir`)
    .replace(between(name(id)), `${between(name(id))}${groupChip}`), html)
const POWERS_LEDE = 'Lu dans le jeu&nbsp;: les pouvoirs, et les bibelots et boissons qui changent un combat. Équiper un pouvoir en fait le tien dans Ton équipement&nbsp;; tu l’allumes sur la fiche d’une créature ou dans la Simulation.'
const arsenalPhone = markGroup(
  arsenal.phone({ caption: 'ARSENAL · À EMPORTER · POUVOIRS', nav: arsenal.navAS('power'), category: 'power', bare: true })
    .replace(`${name(OWN)}, emporté.`, `${name(OWN)}, équipé.`)
    .replace('>EMPORTÉ</span>', '>ÉQUIPÉ</span>'),
  (n) => `<span style="min-width: 0; font-size: 15px">${n}</span>`,
)
const arsenalDesktop = markGroup(
  arsenal.desktop({ nav: '', category: 'power', aside: arsenal.asideC('power'), lede: POWERS_LEDE })
    .replace('>EMPORTÉ</span>', '>ÉQUIPÉ</span>')
    .replace(/(<\/svg>)Emporté<\/span>/, '$1Équipé</span>')
    .replaceAll('aria-label="Emporter&nbsp;: ', 'aria-label="Équiper&nbsp;: ')
    .replaceAll('>Emporter</a>', '>Équiper</a>'),
  (n) => `<span role="cell" style="display: flex; align-items: center; gap: 10px; min-width: 0"><span>${n}</span>`,
)
writeFileSync(new URL('Pouvoirs-B1-Arsenal-Desktop.dc.html', OUT), arsenal.desktopBoard('Pouvoirs — itération 1 de B · l’Arsenal, desktop', arsenalDesktop), 'utf8')
console.log('Pouvoirs-B1-Arsenal-Desktop', 1440, 900)

// Why a drink changes nothing when a group's power already gives its resistance: three wordings, on the Fuling
// shaman, the fire mead carried, Fader's power on.
const SH = data.shaman
const FIRE_MEAD_ID = 'Potion_barleywine'
const reasonFragment = (reason) => {
  const sheet = SH.fader
  const rowsHtml = rows([
    brocheFx,
    fxPower(sheet, OWN),
    { name: 'Vin d’orge de résistance au feu', tag: 'BOISSON · 10 MIN', idle: reason },
    fxPower(sheet, FRIEND, GROUP_TAG),
    fxPower(sheet, OTHER, GROUP_TAG),
  ])
  const tone = sheet.advice.tone
  return `<div style="width: 390px; box-sizing: border-box; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; border: 1px solid ${C.line}; border-radius: 8px; overflow: hidden">` +
    `<header style="flex: none; display: flex; align-items: center; gap: 4px; padding: 10px 16px 4px 4px"><span style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}">${BACK}</span><h1 style="margin: 0; flex: 1; font-size: 20px; font-weight: 500">${SH.name}</h1><span style="${MONO}; font-size: 11px; color: ${C.secondary}">PLAINES</span></header>` +
    `<div style="padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 14px">` +
    `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 14px; color: ${C[tone]}"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ADVICE_ICON[tone]}</svg><span>${sheet.advice.text}</span></div>` +
    card({ open: true, summary: summaryOf(sheet), body: rowsHtml }) + `</div></div>`
}
if (SH.fader.idle[FIRE_MEAD_ID] === null) throw new Error('The fire mead should change nothing with Fader’s power on')
const WORDINGS = [
  ['A · LE NOM DU POUVOIR', `Ne change rien&nbsp;: le ${name(FRIEND)} résiste déjà`, 'La forme d’aujourd’hui (« ta cape résiste déjà »), le pouvoir nommé au lieu de « un pouvoir du groupe ».'],
  ['B · QUI, ET CONTRE QUOI', `Ne change rien&nbsp;: le ${name(FRIEND)} te protège déjà du feu`, 'Dit ce qui protège et de quoi. Les autres raisons suivraient : « ta cape te protège déjà du gel ».'],
  ['C · DÉJÀ COUVERT · RETENUE', `Ne change rien&nbsp;: déjà couvert par le ${name(FRIEND)}`, 'Retenue le 2026-11-01, pour toutes les raisons de ce genre : « déjà couvert par ta cape », « … par ton pouvoir », « … par Moder ».'],
]
const reasonCols = WORDINGS.map(([label, reason, caption]) => [label, reasonFragment(reason), caption])
write('Pouvoirs-B1-Retours', board(
  'Pouvoirs — itération 1 de B · retours',
  'Itération 1 · B, l’Arsenal et la raison',
  `Dans l’Arsenal, ton pouvoir est ÉQUIPÉ et le bouton dit « Équiper » ; ceux du groupe, marqués DU GROUPE, suivent le tien en tête de liste. La raison d’une ligne grisée quand un pouvoir du groupe fait déjà ce qu’elle ferait : le Chaman gobelin lance une boule de feu, tu emportes le Vin d’orge de résistance au feu, le ${name(FRIEND)} d’un ami est allumé. Le vin ne change plus rien : comment le dire ? Retenu : C.`,
  'Aujourd’hui l’app dirait « ton pouvoir résiste déjà », faux ici : le pouvoir n’est pas le tien. L’itération proposait « un pouvoir du groupe résiste déjà ». « Ton pouvoir », dans la liste de Ton équipement, marque aussi ÉQUIPÉ le tien, et « Aucun pouvoir » dit « retire le tien ».',
  [['ARSENAL · POUVOIRS', arsenalPhone.replace(/^<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span[^>]*>[^<]*<\/span>\n/, '').replace(/<\/div>$/, ''), 'Équiper un pouvoir du groupe en fait le tien et le retire du groupe.'], ...reasonCols],
))
