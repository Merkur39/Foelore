// Writes the « Dégâts · pistes » boards (#64) from out/data.json: today's reading and three tracks for the damage a
// hit deals across the game's roll, and the burning and poison that follow it; four phones each, then a desktop.
// Static boards, the figures from the app's engine (data.mts).
// Run from this folder: node --import ../equipement-c3/hooks.mjs data.mts, then node build.mjs
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
const WORD = { holds: 'TIENT', staggered: 'TU TITUBES', broken: 'BRISÉ', unblockable: 'IMPARABLE' }
const SMALL_WORD = { holds: 'tu tiens', staggered: 'tu titubes', broken: 'brisé' }

const fmt = (x) => (Math.round(x * 10) / 10).toLocaleString('fr-FR', { maximumFractionDigits: 1 })
const span = (lo, hi) => (fmt(lo) === fmt(hi) ? fmt(hi) : `${fmt(lo)} à ${fmt(hi)}`)
const seconds = (lo, hi) => (lo === hi ? `${hi} s` : `${lo} à ${hi} s`)
// How often the top's verdict comes, as a player would say it: the simplest « p fois sur q », q up to 10, that falls
// within 2.5 points of it, else the nearest.
const FRACTIONS = Array.from({ length: 9 }, (_, i) => i + 2).flatMap((q) => Array.from({ length: q - 1 }, (_, p) => [p + 1, q]))
const often = (share) => {
  const near = FRACTIONS.find(([p, q]) => Math.abs(p / q - share) <= 0.025)
  const [p, q] = near ?? FRACTIONS.reduce((best, f) => (Math.abs(f[0] / f[1] - share) < Math.abs(best[0] / best[1] - share) ? f : best))
  return `${p} fois sur ${q}`
}

const ICON = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
const TYPES = {
  blunt: ['CONTONDANT', 'M13 3l8 8-4 4-8-8zM13 11l-9 9'],
  slash: ['COUPANT', 'M4 14L14 4M7 19L19 7M13 20l7-7'],
  pierce: ['PERFORANT', 'M20 4l-7 3 4 4zM15 9L4 20'],
  fire: ['FEU', 'M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 6 12 3z'],
  poison: ['POISON', 'M12 3c3 4.5 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-6.5 6-11z'],
}
const typeIcon = (key, size = 12) =>
  `<svg ${ICON} width="${size}" height="${size}" style="vertical-align: -2px; margin-right: 3px"><path d="${TYPES[key][1]}"></path></svg>`
const KINDS = { melee: 'MÊLÉE', area: 'ZONE', projectile: 'PROJECTILE' }
const tags = (scene, extra) =>
  [...scene.types.map((t) => typeIcon(t) + TYPES[t][0]), KINDS[scene.kind], ...extra].join(' · ')

/** What the game deals, in all, at a roll: the hit, then the burn and the poison it leaves. */
const dealt = (at) => at.direct + at.burn + at.poison

// The stagger bar: what was there, what passes the shield, what passes the armor; then, in track A, the stretch
// between the lowest roll and the highest, hatched.
function bar(g, { height, withRange }) {
  const { low, top } = g
  const tone = TONE[top.verdict]
  const color = C[tone]
  const fill = C[`${tone}Fill`]
  const parts = withRange ? low.parts : top.parts
  let used = 0
  const widths = parts.map((part) => {
    const w = Math.min(100 - used, (Math.max(0, part) / top.limit) * 100)
    used += w
    return w
  })
  const stretch = withRange ? Math.min(100 - used, ((top.bar - low.bar) / top.limit) * 100) : 0
  return `<div role="img" style="height: ${height}px; display: flex; overflow: hidden; border-radius: 2px; background: ${C.bg}">` +
    `<span style="width: ${widths[0].toFixed(2)}%; background: ${C.line}"></span>` +
    `<span style="width: ${widths[1].toFixed(2)}%; background: ${fill}"></span>` +
    `<span style="width: ${widths[2].toFixed(2)}%; background: ${color}"></span>` +
    (stretch > 0 ? `<span style="width: ${stretch.toFixed(2)}%; background: repeating-linear-gradient(135deg, ${color} 0 2px, transparent 2px 5px)"></span>` : '') +
    `</div>`
}

const barText = (g, mode) => {
  const { low, top } = g
  if (top.staggered && (mode !== 'range' || low.staggered)) return 'barre : déborde'
  if (top.staggered) return `barre : ${fmt(low.bar)} / ${fmt(top.limit)} · peut déborder`
  if (mode === 'range') return `barre : ${span(low.bar, top.bar)} / ${fmt(top.limit)}`
  if (mode === 'upTo') return `barre : jusqu'à ${fmt(top.bar)} / ${fmt(top.limit)}`
  return `barre : ${fmt(top.bar)} / ${fmt(top.limit)}`
}

const stamina = (s) => (s < 0 ? `+${fmt(-s)} endurance` : s === 0 ? '0 endurance' : `−${Math.round(s)} endurance`)

// The line a track adds under « subis » for the burn or the poison.
function overTimeLine(g, track) {
  const { low, top } = g
  if (top.burn > 0) {
    if (track === 'A') return `+ ${span(low.burn, top.burn)} brûlure · 5 s`
    if (track === 'B') return `dont ${fmt(top.burn)} en brûlure, 5 s`
  }
  if (top.poison > 0) {
    if (track === 'A') return `+ ${span(low.poison, top.poison)} poison · ${seconds(low.poisonSeconds, top.poisonSeconds)}`
    if (track === 'B') return `dont ${fmt(top.poison)} en poison, ${top.poisonSeconds} s`
  }
  return null
}
const overTimeIcon = (g) => (g.top.burn > 0 ? 'fire' : g.top.poison > 0 ? 'poison' : null)

/** One guard's card, as a track reads it. `big` is the desktop's. With `rangeFold`, its bar is drawn as track A draws
 * it (solid to the lowest roll, hatched to the highest) while that fold is open. */
function card(track, label, g, big = false, rangeFold = null) {
  const { low, top, share } = g
  const tone = TONE[top.verdict]
  const color = C[tone]
  const border = tone === 'ok' ? C.line : C[`${tone}Fill`]
  const size = big ? { pad: 18, gap: 8, label: 11, word: 16, number: track === 'A' ? 26 : 30, unit: 12, small: 13, note: 12, bar: 10 } : { pad: 12, gap: 6, label: 11, word: 14, number: track === 'A' ? 20 : 22, unit: 11, small: 12, note: 11, bar: 8 }
  const rows = []
  rows.push(`<span style="font-size: ${size.label}px; letter-spacing: 0.08em; color: ${C.secondary}">${label}</span>`)
  rows.push(`<span style="${MONO}; font-size: ${size.word}px; font-weight: 500; color: ${color}">${WORD[top.verdict]}</span>`)
  if (track === 'A' && share < 0.999) {
    const other = low.verdict
    rows.push(`<span style="${MONO}; font-size: ${size.note}px; line-height: 1.35; letter-spacing: 0.02em; color: ${C.secondary}">${often(share).toUpperCase()} · SINON <span style="color: ${C[TONE[other]]}">${WORD[other]}</span></span>`)
  }
  let number
  if (track === 'today') number = `${fmt(top.today)} <span style="font-size: ${size.unit}px; color: ${C.faint}">subis</span>`
  else if (track === 'A') number = `${fmt(low.direct)}${fmt(low.direct) === fmt(top.direct) ? '' : `<span style="margin: 0 0.3em; font-family: 'IBM Plex Sans', sans-serif; font-size: ${size.unit + 2}px; color: ${C.secondary}">à</span>${fmt(top.direct)}`} <span style="font-size: ${size.unit}px; color: ${C.faint}">subis</span>`
  else if (track === 'B') number = `<span style="font-family: 'IBM Plex Sans', sans-serif; font-size: ${size.unit + 1}px; color: ${C.secondary}">jusqu'à </span>${fmt(dealt(top))} <span style="font-size: ${size.unit}px; color: ${C.faint}">subis</span>`
  else number = `${fmt(dealt(top))} <span style="font-size: ${size.unit}px; color: ${C.faint}">subis</span>`
  rows.push(`<span style="${MONO}; font-size: ${size.number}px; line-height: 1.2">${number}</span>`)
  const extra = overTimeLine(g, track)
  if (extra) {
    const icon = overTimeIcon(g)
    rows.push(`<span style="${MONO}; font-size: ${size.small}px; line-height: 1.35; color: ${C.secondary}">${typeIcon(icon, size.small)}${extra}</span>`)
  }
  rows.push(`<span style="${MONO}; font-size: ${size.small}px; color: ${C.secondary}">${stamina(top.stamina)}</span>`)
  if (rangeFold) {
    const { name, open } = rangeFold
    rows.push(`<sc-if value="{{ ${name}.open }}" hint-placeholder-val="{{ ${open} }}">${bar(g, { height: size.bar, withRange: true })}</sc-if>`)
    rows.push(`<sc-if value="{{ ${name}.closed }}" hint-placeholder-val="{{ ${!open} }}">${bar(g, { height: size.bar, withRange: false })}</sc-if>`)
  } else rows.push(bar(g, { height: size.bar, withRange: track === 'A' }))
  const mode = track === 'A' ? 'range' : track === 'B' ? 'upTo' : 'top'
  const overflowing = top.staggered
  rows.push(`<span style="${MONO}; font-size: ${size.note}px; color: ${overflowing ? color : C.faint}">${barText(g, mode)}</span>`)
  return `<div style="display: flex; flex-direction: column; gap: ${size.gap}px; padding: ${size.pad}px; border-radius: ${big ? 8 : 6}px; background: ${C.surface}; border: 1px solid ${border}">${rows.join('')}</div>`
}

// Track C: what the game rolls, folded under the cards.
function detailNotes(g) {
  const { low, top, share } = g
  const notes = []
  if (share < 0.999) notes.push(`${SMALL_WORD[top.verdict]} ${often(share)}, sinon ${SMALL_WORD[low.verdict]}`)
  if (top.burn > 0) notes.push(`puis ${span(low.burn, top.burn)} de brûlure en 5 s`)
  else if (g.fireNoBurn) notes.push('trop peu de feu passe pour brûler')
  if (top.poison > 0) notes.push(`puis ${span(low.poison, top.poison)} de poison en ${seconds(low.poisonSeconds, top.poisonSeconds)}`)
  if (!top.staggered && top.verdict !== 'unblockable') notes.push(`barre ${span(low.bar, top.bar)} / ${fmt(top.limit)}`)
  return [span(low.direct, top.direct), ...notes]
}
function detailLines(lines, guard) {
  const [taken, ...notes] = lines
  const rows = [`<span style="${MONO}; font-size: 14px; color: ${C.ink}">${taken} <span style="font-size: 11px; color: ${C.faint}">subis</span></span>`, ...notes.map((note) => `<span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">${note}</span>`)]
  return `<div style="display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 12px; padding: 10px 0; border-top: 1px solid ${C.lineSoft}"><span style="padding-top: 3px; font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${guard}</span><span style="min-width: 0; display: flex; flex-direction: column; gap: 3px">${rows.join('')}</span></div>`
}
/** `fold` names the board's state for this fold when it opens and closes in Play; else it is drawn as `open` says. */
function rollFold(scene, open, { title = 'Ce que le jeu tire', fold = null } = {}) {
  const transform = fold ? `{{ ${fold}.chevron }}` : open ? 'rotate(180deg)' : 'none'
  const chevron = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="${C.secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none; transition: transform 0.15s; transform: ${transform}"><path d="M6 9l6 6 6-6"></path></svg>`
  const summary = scene.rolled ? 'Chaque coup varie de 87 à 100 %' : 'Ce coup ne varie pas'
  const texts = `<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px; line-height: 20px; color: ${C.ink}">${title}</span><span style="font-size: 12px; line-height: 16px; color: ${C.secondary}">${summary}</span></span>${chevron}`
  const headStyle = 'display: flex; align-items: center; gap: 12px; width: 100%; min-height: 56px; box-sizing: border-box; padding: 8px 12px; text-align: left'
  const head = fold
    ? `<button type="button" onClick="{{ ${fold}.toggle }}" aria-expanded="{{ ${fold}.expanded }}" style="${headStyle}">${texts}</button>`
    : `<div style="${headStyle}">${texts}</div>`
  // Two guards that read the same (a hit no guard takes) make one row.
  const block = detailNotes(scene.block)
  const parry = detailNotes(scene.parry)
  const rows = block.join('|') === parry.join('|') ? detailLines(block, 'LE COUP') : detailLines(block, 'EN BLOQUANT') + detailLines(parry, 'EN PARANT')
  const inner = `<div style="padding: 0 12px 2px">${rows}</div>`
  const body = fold ? `<sc-if value="{{ ${fold}.open }}" hint-placeholder-val="{{ ${open} }}">${inner}</sc-if>` : open ? inner : ''
  return `<div style="flex: none; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.bg}">${head}${body}</div>`
}

const ADVICE_ICON = {
  ok: '<path d="M5 12l5 5L20 7"></path>',
  warn: '<path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9L2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path>',
  bad: '<path d="M6 6l12 12M18 6L6 18"></path>',
}
function advice(scene, big) {
  const a = scene.advice
  const [tone, text] =
    a.action === 'block'
      ? ['ok', 'Bloque-le : tu tiens sans tituber']
      : a.action === 'parry'
        ? ['warn', a.block === 'broken' ? 'Pare-le : le blocage cède' : 'Pare-le : en bloquant, tu titubes']
        : ['bad', scene.dodgeable === null ? 'Imparable : esquive si tu peux' : scene.dodgeable ? 'Imparable : esquive-le' : 'Imparable : éloigne-toi']
  const size = big ? 22 : 18
  return `<div style="flex: none; display: flex; align-items: center; gap: ${big ? 10 : 8}px; font-size: ${big ? 18 : 15}px; color: ${C[tone]}"><svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ADVICE_ICON[tone]}</svg><span>${text}</span></div>`
}

const NOTE_B = 'Chaque coup du jeu varie de 87 à 100 % : Foelore compte le plus fort.'
const DODGE = (big) => `<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: ${big ? 14 : 13}px; color: ${C.secondary}"><svg viewBox="0 0 24 24" width="${big ? 18 : 16}" height="${big ? 18 : 16}" fill="none" stroke="${C.ok}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16a8 8 0 0 1 14.5-6.5"></path><path d="M19 4.5v5h-5"></path><path d="M3 20h8"></path></svg><span>Esquivable en roulade</span></div>`
const REPORT = (big) => `<span style="flex: none; align-self: flex-start; display: flex; align-items: center; gap: 8px; min-height: ${big ? 36 : 44}px; font-size: 13px; color: ${C.accent}"><svg viewBox="0 0 24 24" width="${big ? 15 : 16}" height="${big ? 15 : 16}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"></path></svg>Ce verdict te paraît faux ? Signale-le</span>`

/** The result: advice, the two cards, what a track adds under them. */
function result(track, scene, { big = false, open = false, fold = null, title, rangeBars = false } = {}) {
  const parts = [advice(scene, big)]
  const rangeFold = rangeBars && fold ? { name: fold, open } : null
  parts.push(`<div style="flex: none; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: ${big ? 16 : 8}px; align-items: start">${card(track, 'EN BLOQUANT', scene.block, big, rangeFold)}${card(track, 'EN PARANT', scene.parry, big, rangeFold)}</div>`)
  if (track === 'B') parts.push(`<span style="flex: none; font-size: ${big ? 13 : 12}px; line-height: 1.45; color: ${C.faint}">${NOTE_B}</span>`)
  if (track === 'C') parts.push(rollFold(scene, open, { fold, title }))
  // A free value has no roll to dodge.
  if (scene.dodgeable !== null) parts.push(DODGE(big))
  parts.push(REPORT(big))
  return parts.join('')
}

const SHIELD = '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"></path>'
const GLOBE = '<circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18"></path>'
const PAW = '<circle cx="6.5" cy="10" r="2"></circle><circle cx="12" cy="6.5" r="2"></circle><circle cx="17.5" cy="10" r="2"></circle><path d="M8 18c0-3 1.8-5 4-5s4 2 4 5c0 1.7-1.8 2.5-4 2.5S8 19.7 8 18z"></path>'
const VD = `VD ${Math.round(data.blockPower)}`
const seg = (labels, picked, mono) =>
  `<div style="flex: none; display: flex; border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden">${labels.map((l, i) => `<span style="flex: 1; height: 40px; display: flex; align-items: center; justify-content: center; font-size: ${mono ? 12 : 13}px; ${mono ? MONO + ';' : ''} ${i === picked ? `background: ${C.accent}; color: ${C.bg}; font-weight: 500` : `color: ${C.secondary}`}">${l}</span>`).join('')}</div>`

/** A phone on the Simulation, this scene's attack picked. */
function phone(track, scene, { open = false, scroll = 0, fold = null, title, rangeBars = false } = {}) {
  const free = scene.id === 'free'
  const chip = free ? '' : `<div style="display: flex; align-items: center; gap: 10px; min-height: 56px; padding: 8px 12px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.bg}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${C.accent}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PAW}</svg><span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 15px">${scene.creature.fr} · ${scene.attack.fr}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">${tags(scene, ['CHANGER'])}</span></span><span style="${MONO}; font-size: 22px">${fmt(scene.listed)}</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${C.faint}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></div>`
  const stepButton = (label, path) => `<span aria-label="${label}" style="width: 48px; height: 48px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; display: flex; align-items: center; justify-content: center"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="${path}"></path></svg></span>`
  const value = free ? `<div style="display: flex; align-items: center; justify-content: center; gap: 12px">${stepButton('Baisser de 5', 'M5 12h14')}<span style="min-width: 80px; text-align: center; ${MONO}; font-size: 34px">${fmt(scene.listed)}</span>${stepButton('Monter de 5', 'M12 5v14M5 12h14')}</div><span style="text-align: center; font-size: 12px; color: ${C.faint}">Dégâts de base du coup, avant difficulté et joueurs proches.</span>` : ''
  const hit = `<section style="flex: none; background: ${C.surface}; border-radius: 6px; padding: 12px; display: flex; flex-direction: column; gap: 10px">${chip}${value}<div style="display: flex; flex-direction: column; gap: 6px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">BARRE DE STAGGER AVANT LE COUP</span>${seg(['0 %', '25 %', '50 %', '75 %'], 0, true)}</div></section>`
  const header = `<header style="flex: none; display: flex; align-items: center; gap: 8px; padding: 6px 16px 4px"><span style="flex: 1; display: flex; align-items: center; gap: 8px; font-size: 20px; font-weight: 500"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${C.accent}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHIELD}</svg>Foelore</span><span style="height: 36px; display: flex; align-items: center; gap: 8px; padding: 0 8px 0 10px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 4px; ${MONO}; font-size: 12px"><span style="display: flex; align-items: center; gap: 4px"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SHIELD}</svg>${VD}</span><span style="display: flex; align-items: center; gap: 4px"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${GLOBE}</svg>×1</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="${C.secondary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></span><span style="width: 44px; height: 44px; margin-right: -10px; display: flex; align-items: center; justify-content: center; color: ${C.secondary}"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"></path><circle cx="15" cy="6" r="2"></circle><circle cx="9" cy="12" r="2"></circle><circle cx="17" cy="18" r="2"></circle></svg></span></header>`
  const nav = `<nav style="flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid ${C.line}; padding: 6px 0 14px">${['Bestiaire', 'Simulation', 'Arsenal', 'Mémo'].map((n) => `<span style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; font-size: 11px; color: ${n === 'Simulation' ? C.accent : C.faint}">${n}</span>`).join('')}</nav>`
  // In Play, an open fold may push the end of the screen down: it scrolls, as the app does.
  const main = `<main style="flex: 1; min-height: 0; overflow: ${fold ? 'hidden auto' : 'hidden'}; padding: 4px 16px 12px"><div style="display: flex; flex-direction: column; gap: 12px; margin-top: ${-scroll}px">${seg(["Attaque d'un monstre", 'Valeur libre'], free ? 1 : 0, false)}${hit}${result(track, scene, { open, fold, title, rangeBars })}</div></main>`
  return `<div style="width: 390px; height: 844px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 8px; overflow: hidden; background: ${C.bg}; display: flex; flex-direction: column">${header}${main}${nav}</div>`
}

const SCENE_LABELS = ['MODER · MORSURE · LE CAS DU TICKET', 'MODER · GRIFFE · LE VERDICT CHANGE AVEC LE JET', 'CULTISTE · GRIFFE DE FEU · LA BRÛLURE', "MASSE-D'OS · COUP DE POING · LE POISON"]
const GEAR_LINE = `Bouclier en fer N3, Blocage 16, armure 48, 140 PV · combat normal, 1 joueur · chiffres du moteur de l'app, jet du jeu appliqué (√ d'un tirage entre 0,75 et 1).`

// The tracks show the first four scenes; track C's iteration, all of them.
function board(title, heading, desc, proscons, track, opts = [], { scenes = data.scenes.slice(0, 4), labels = SCENE_LABELS } = {}) {
  const phones = scenes.map((scene, i) => `<div style="flex: none; width: 390px; display: flex; flex-direction: column; gap: 10px"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">${labels[i]}</span>${phone(track, scene, opts[i] ?? {})}${opts[i]?.caption ? `<span style="font-size: 12px; line-height: 1.45; color: ${C.faint}">${opts[i].caption}</span>` : ''}</div>`).join('')
  const width = 40 * 2 + 390 * scenes.length + 32 * (scenes.length - 1)
  const html = `<div style="width: ${width}px; height: 1220px; box-sizing: border-box; padding: 40px; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; display: flex; flex-direction: column; gap: 28px"><header style="display: flex; flex-direction: column; gap: 6px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">${heading}</h1><p style="margin: 0; max-width: 1400px; font-size: 15px; line-height: 1.5; color: ${C.secondary}">${desc}</p><p style="margin: 0; max-width: 1400px; font-size: 13px; line-height: 1.5; color: ${C.faint}">${proscons}</p><p style="margin: 0; max-width: 1400px; font-size: 12px; line-height: 1.5; color: ${C.faint}">${GEAR_LINE}</p></header><div style="display: flex; gap: 32px; align-items: flex-start">${phones}</div></div>`
  return { html, width, height: 1220, title }
}

const SIDEBAR = (() => {
  const source = readFileSync(new URL('Desktop-Combat.dc.html', OUT), 'utf8')
  const nav = source.slice(source.indexOf('<nav aria-label="Navigation principale"'), source.indexOf('</nav>') + 6)
  return nav
    .replace('aria-label="Ton équipement : bouclier en argent niveau 3, compétence Blocage 25"', `aria-label="Ton équipement : bouclier en fer niveau 3, compétence Blocage 16"`)
    .replace('<span style="font-size: 14px">Argent N3</span>', '<span style="font-size: 14px">Bouclier en fer N3</span>')
    .replace('VD 81 · BLOCAGE 25', `${VD} · BLOCAGE 16`)
})()

/** The desktop Simulation, Bonemass's punch picked. */
function desktop(track, heading, { open = false, fold = null, title, rangeBars = false } = {}) {
  const scene = data.scenes[3]
  const chip = `<div style="display: flex; align-items: center; gap: 12px; min-height: 64px; padding: 10px 14px; box-sizing: border-box; border: 1px solid ${C.line}; border-radius: 6px; background: ${C.bg}"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="${C.accent}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PAW}</svg><span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 16px">${scene.creature.fr} · ${scene.attack.fr}</span><span style="${MONO}; font-size: 11px; color: ${C.secondary}">${tags(scene, ['MARAIS'])}</span></span><span style="${MONO}; font-size: 28px">${fmt(scene.listed)}</span><span style="font-size: 13px; color: ${C.accent}">Changer</span></div>`
  const segD = (labels, picked, width, mono) => `<div style="display: flex; border: 1px solid ${C.line}; border-radius: 4px; overflow: hidden">${labels.map((l, i) => `<span style="${width ? `width: ${width}px` : 'flex: 1'}; height: 36px; display: flex; align-items: center; justify-content: center; font-size: ${mono ? 12 : 14}px; ${mono ? MONO + ';' : ''} ${i === picked ? `background: ${C.accent}; color: ${C.bg}; font-weight: 500` : `color: ${C.secondary}`}">${l}</span>`).join('')}</div>`
  const left = `<section style="background: ${C.surface}; border-radius: 8px; padding: 24px; display: flex; flex-direction: column; gap: 18px"><h2 style="margin: 0; font-size: 16px; font-weight: 500">Le coup</h2>${segD(["Attaque d'un monstre", 'Valeur libre'], 0, 0, false)}${chip}<div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap"><span style="font-size: 11px; letter-spacing: 0.08em; color: ${C.secondary}">BARRE DE STAGGER AVANT LE COUP</span>${segD(['0 %', '25 %', '50 %', '75 %'], 0, 56, true)}</div><span style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: ${C.secondary}">Tes seuils sont dans Ton équipement</span></section>`
  const right = `<section style="display: flex; flex-direction: column; gap: 16px">${result(track, scene, { big: true, open, fold, title, rangeBars })}</section>`
  const main = `<main style="flex: 999 1 560px; min-width: 0; height: 100%; overflow: hidden; box-sizing: border-box; padding: 28px 32px 32px"><div style="max-width: 1180px; display: flex; flex-direction: column; gap: 24px"><header style="display: flex; flex-direction: column; gap: 4px"><h1 style="margin: 0; font-size: 26px; font-weight: 500">Simulation</h1><p style="margin: 0; font-size: 15px; color: ${C.secondary}">Choisis une attaque : la page te dit comment la prendre avec ton équipement.</p></header><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 24px; align-items: start">${left}${right}</div></div></main>`
  const html = `<div style="width: 1440px; height: 900px; box-sizing: border-box; display: flex; background: ${C.bg}; color: ${C.ink}; font-family: 'IBM Plex Sans', system-ui, sans-serif; overflow: hidden">${SIDEBAR}${main}</div>`
  return { html, width: 1440, height: 900, title: heading }
}

// `folds`: each fold of the board that opens and closes in Play, open or not at first.
function write(name, { html, width, height, title }, folds = []) {
  const logic = folds.length === 0
    ? `  renderVals() {
    return {};
  }`
    : `  constructor(props) {
    super(props);
    this.state = { open: ${JSON.stringify(folds)} };
  }
  renderVals() {
    const open = this.state.open;
    const fold = (i) => ({
      open: open[i],
      closed: !open[i],
      expanded: String(open[i]),
      chevron: open[i] ? 'rotate(180deg)' : 'none',
      toggle: () => this.setState({ open: open.map((o, j) => (j === i ? !o : o)) })
    });
    return { ${folds.map((_, i) => `f${i}: fold(${i})`).join(', ')} };
  }`
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
button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
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

const [bite, claw, fireclaw, punch] = data.scenes
const fireNoBurn = (g) => ({ ...g, fireNoBurn: true })
fireclaw.parry = fireNoBurn(fireclaw.parry)

write('Degats-Auj', board(
  'Dégâts — aujourd’hui',
  'Aujourd’hui · le haut du jet, sans le dire',
  'L’app prend chaque coup au plus fort du jet du jeu, et compte dans « subis » le feu et le poison qui passent l’armure, même quand le jeu n’en tire aucune brûlure.',
  `Le jeu, lui : la Morsure parée fait ${span(bite.parry.low.direct, bite.parry.top.direct)}, la Griffe bloquée ${span(claw.block.low.direct, claw.block.top.direct)} (tu titubes seulement ${often(1 - claw.block.share)}), la Griffe de feu parée ${fmt(fireclaw.parry.top.direct)} sans brûlure, le Coup de poing bloqué ${span(punch.block.low.direct, punch.block.top.direct)} puis du poison pendant ${seconds(punch.block.low.poisonSeconds, punch.block.top.poisonSeconds)}.`,
  'today',
))
write('Degats-A', board(
  'Dégâts — piste A',
  'A · Des fourchettes, sur la carte',
  'Chaque carte dit ce que le jeu peut infliger, du jet le plus faible au plus fort. La brûlure et le poison ont leur ligne, avec leur durée, et n’apparaissent que si le jeu en inflige. Le verdict reste celui du jet le plus fort ; quand il change avec le jet, la carte dit combien de fois.',
  'Pour : tout est vrai et sous les yeux, rien à ouvrir. Contre : deux nombres partout, des cartes plus hautes, « 3 fois sur 4 » à lire. EN : 3.3 to 5.8 taken · + 1.7 to 2.9 burning · 5 s · 3 TIMES IN 4 · ELSE YOU STAGGER · bar: 28.3 to 39.1 / 56.',
  'A',
))
write('Degats-B', board(
  'Dégâts — piste B',
  'B · « Jusqu’à », et une ligne',
  'Un seul nombre, le plus fort du jet, annoncé comme tel. La brûlure et le poison y sont comptés quand le jeu en inflige, et dits en dessous (« dont »). Une ligne sous les cartes dit pourquoi « jusqu’à ».',
  `Pour : le plus proche d’aujourd’hui, le plus sobre. Contre : le bas du jet et un verdict qui change avec lui restent invisibles. EN : up to 5.8 taken · of which 2.9 burning, 5 s · « ${'Every hit in the game varies from 87 to 100%: Foelore counts the strongest.'} »`,
  'B',
))
write('Degats-C', board(
  'Dégâts — piste C',
  'C · Le plus fort sur la carte, le détail replié',
  'Les cartes gardent un nombre, le plus fort du jet, brûlure et poison compris quand le jeu en inflige. « Ce que le jeu tire », replié sous les cartes, donne les fourchettes, la brûlure et le poison à part avec leur durée, et la fréquence d’un verdict qui change avec le jet.',
  'Pour : les cartes ne bougent pas, le détail est là pour qui le cherche. Contre : un repli de plus, qui répète en partie les cartes. EN : What the game rolls · Every hit varies from 87 to 100% · then 1.7 to 2.9 burning over 5 s · broken 3 times in 4, else you stagger.',
  'C',
  [{ open: false }, { open: true }, { open: true }, { open: true }],
))
write('Degats-A-Desktop', desktop('A', 'A · desktop'))
write('Degats-B-Desktop', desktop('B', 'B · desktop'))
write('Degats-C-Desktop', desktop('C', 'C · desktop', { open: true }))

// Iteration 1 of track C, the owner's pick: « Détails », opening and closing in Play.
const breath = data.scenes[4]
const C1_FOLDS = [false, true, true, true, true, true]
write('Degats-C1', board(
  'Dégâts — itération 1 de C',
  'Itération 1 · C, avec « Détails »',
  '« Ce que le jeu tire » devient « Détails ». Replié en arrivant sur la Simulation ; ouvert, il le reste d’une attaque à l’autre jusqu’à ce que tu quittes l’écran, sans rien enregistrer. Les cartes comptent la brûlure et le poison dans « subis » quand le jeu en inflige ; « Détails » les sépare, avec leur durée, et dit combien de fois le verdict tombe quand le jet le change.',
  `Mes arbitrages : la fréquence se dit « p fois sur q », q jusqu’à 10, la plus simple qui tombe à 2,5 points près (valeur libre bloquée : tu titubes ${Math.round(data.scenes[5].block.share * 100)} % du temps → « tu titubes ${often(data.scenes[5].block.share)} »). Un coup qui ne varie pas (zone ou projectile qui porte ses propres dégâts) dit « Ce coup ne varie pas » ; sans brûlure, poison ni verdict qui change, il n’a pas de « Détails ». Deux gardes qui disent la même chose (imparable) font une seule ligne, « LE COUP ». La valeur libre est tirée comme le coup d’une attaque. EN : Details · Every hit varies from 87 to 100% · This hit does not vary · you stagger 1 time in 7, else you hold · then ${fmt(breath.block.top.burn).replace(',', '.')} burning over 5 s.`,
  'C',
  C1_FOLDS.map((open, i) => ({ open, fold: `f${i}`, title: 'Détails' })),
  {
    scenes: data.scenes,
    labels: [...SCENE_LABELS.map((label, i) => (i === 0 ? 'MODER · MORSURE · REPLIÉ, À L’ARRIVÉE' : label)), 'FADER · SOUFFLE DE FLAMMES · UN COUP SANS JET', `VALEUR LIBRE · ${data.scenes[5].listed}`],
  },
), C1_FOLDS)
write('Degats-C1-Desktop', desktop('C', 'Itération 1 · C · desktop', { open: true, fold: 'f0', title: 'Détails' }), [true])

// Iteration 2 of track C, on the owner's word: while « Détails » is open, the cards' own bars read as track A's.
const C2_FOLDS = [false, true, true, true, true, true]
write('Degats-C2', board(
  'Dégâts — itération 2 de C',
  'Itération 2 · C, les barres en fourchette',
  'Tant que « Détails » est ouvert, la barre de chaque carte se dessine comme dans la piste A : pleine jusqu’au jet le plus faible, hachurée jusqu’au plus fort. Replié, elle redevient celle d’aujourd’hui. Rien d’autre ne change sur les cartes ; « Détails » reste celui de l’itération 1.',
  `Mes arbitrages : le texte sous la barre ne bouge pas (le plus fort du jet, ou « déborde ») ; la fourchette en chiffres reste dans « Détails ». Une barre qui déborde dès le jet le plus faible reste pleine. Ouvre et replie « Détails » en Play pour voir les barres changer (valeur libre bloquée : pleine jusqu’à ${fmt(data.scenes[5].block.low.bar)}, hachurée jusqu’au bout).`,
  'C',
  C2_FOLDS.map((open, i) => ({ open, fold: `f${i}`, title: 'Détails', rangeBars: true })),
  {
    scenes: data.scenes,
    labels: [...SCENE_LABELS.map((label, i) => (i === 0 ? 'MODER · MORSURE · REPLIÉ, À L’ARRIVÉE' : label)), 'FADER · SOUFFLE DE FLAMMES · UN COUP SANS JET', `VALEUR LIBRE · ${data.scenes[5].listed}`],
  },
), C2_FOLDS)
write('Degats-C2-Desktop', desktop('C', 'Itération 2 · C · desktop', { open: true, fold: 'f0', title: 'Détails', rangeBars: true }), [true])
