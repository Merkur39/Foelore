// Carries track B (#69, approved on 2026-11-01, v213) into the Origine boards, once: Humide (Wet, the game's word) is
// a switch in « Ton contexte », where the Bestiary's biome rains (the Black Forest does), for every creature of it: a
// row under Ton monde in the phone's context sheet, a chip in the desktop's sidebar; the biome, the context button and
// the desktop sheet say HUMIDE while it is on. The Magic barrier comes from the group: Ton équipement's « Pouvoirs du
// groupe » becomes « Du groupe » and gains it, with the caster's Blood Magic; the card « Avec tes effets temporaires »
// of the sheet and the Simulation gains it after Fader's power, « DU GROUPE · ABSORBE 300 · 1 À 4 MIN ». On, each of
// the Troll's attacks says how many such hits it takes (SE_Shield: it counts the whole hit, the Troll's chop 100 and
// pickaxe 40 too, and takes whole the hit that overflows it), and the Simulation says it above the advice; the
// verdicts stay those once it breaks.
// Run from this folder, once, then: build_bestiary_search.py, sync_themes.py, check_canvas.py.
import { readFileSync, writeFileSync } from 'node:fs'

const PROJECT = new URL('../../canvas/project/', import.meta.url)
const read = (file) => readFileSync(new URL(file, PROJECT), 'utf8')
// Every board is checked before any is written: one that does not hold what it should stops them all.
const pending = new Map()
const edit = (file, change) => pending.set(file, change(pending.get(file) ?? read(file)))
// Replaces `from` by `to`, which must occur exactly `count` times.
function swap(text, from, to, count = 1) {
  const found = text.split(from).length - 1
  if (found !== count) throw new Error(`expected ${count} of ${JSON.stringify(from.slice(0, 80))}, found ${found}`)
  return text.replaceAll(from, to)
}
const blockAround = (text, marker, open, close) => {
  const at = text.indexOf(marker)
  if (at === -1) throw new Error(`no ${marker}`)
  const start = text.lastIndexOf(open, at)
  const end = text.indexOf(close, at) + close.length
  return text.slice(start, end)
}

// ——— Humide in « Ton contexte » ————————————————————————————————————————————————————————————————————————————————

const RAIN = '<path d="M7 15a4 4 0 0 1-.5-7.97A6 6 0 0 1 18 8a3.5 3.5 0 0 1 0 7H7z"></path><path d="M8 18l-1 2.5M12 18l-1 2.5M16 18l-1 2.5"></path>'
const rain = (size, width = 1.75) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="#8EBDE3" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none">${RAIN}</svg>`
const TRACK = `<span aria-hidden="true" style="position: relative; width: 38px; height: 22px; box-sizing: border-box; border: 1px solid {{ wetTrackBorder }}; border-radius: 12px; background: {{ wetTrack }}; transition: background 0.15s, border-color 0.15s"><span style="position: absolute; top: 1px; left: {{ wetKnob }}; width: 18px; height: 18px; border-radius: 50%; background: {{ wetKnobColor }}; transition: left 0.15s"></span></span>`
const WET_VALS = `  // « Humide », the weather of the Bestiary's biome (the Black Forest, where it rains): a switch in Ton contexte,
  // counted for every creature of the biome until it is switched off or the biome changes.
  wetVals() {
    const wet = !!(this.state || {}).wet;
    return {
      wet: wet,
      wetChecked: String(wet),
      toggleWet: () => this.setState({ wet: !wet }),
      wetTrack: wet ? '#8EBDE3' : '#2C383D',
      wetTrackBorder: wet ? '#8EBDE3' : '#7D8B91',
      wetKnob: wet ? '17px' : '1px',
      wetKnobColor: wet ? '#0D1214' : '#97A5AA',
      wetBorder: wet ? '#8EBDE3' : '#2C383D',
      wetTag: wet ? ' · HUMIDE' : '',
      menuLabel: 'Ton contexte : VD 81 ×1' + (wet ? ', humide' : '')
    };
  }
`
const withWetVals = (text) =>
  swap(text, '  renderVals() {\n', `  renderVals() {\n    return Object.assign(this.boardVals(), this.wetVals());\n  }\n${WET_VALS}  boardVals() {\n`)

// The phone: a row under Ton monde in the context sheet, and the rain on the context button while it is on.
const MOBILE_ROW = `
      <div style="height: 1px; background: #1F2A2E"></div>
      <div style="display: flex; align-items: center; gap: 12px; padding: 12px 14px">
        ${rain(22)}
        <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
          <span style="font-size: 11px; letter-spacing: 0.08em; color: #97A5AA">MÉTÉO</span>
          <span id="ctx-wet" style="font-size: 16px">Humide</span>
          <span style="font-family: 'IBM Plex Mono', monospace; font-size: 11px; color: #97A5AA">FEU ×0,5 · GLACE ET FOUDRE ×1,5</span>
        </span>
        <button type="button" role="switch" aria-checked="{{ wetChecked }}" aria-labelledby="ctx-wet" onClick="{{ toggleWet }}" style="flex: none; width: 44px; height: 44px; margin: -6px 0; display: flex; align-items: center; justify-content: center">${TRACK}</button>
      </div>
      <p style="margin: 0; padding: 0 14px; font-size: 12px; line-height: 16px; color: #7D8B91">Compté pour toutes les créatures de la Forêt noire, jusqu'à ce que tu l'éteignes ou changes de biome.</p>`
for (const file of ['Bestiaire.dc.html', 'Main.dc.html', 'Arsenal.dc.html', 'Arsenal-Recherche.dc.html', 'Memo.dc.html']) {
  edit(file, (text) => {
    const world = blockAround(text, '>TON MONDE<', '<a href="Monde.dc.html"', '</a>')
    text = swap(text, world, world + MOBILE_ROW)
    text = swap(text, 'aria-label="Ton contexte : VD 81 ×1"', 'aria-label="{{ menuLabel }}"')
    text = swap(
      text,
      '×1</span>\n        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#97A5AA"',
      `×1</span>\n        <sc-if value="{{ wet }}" hint-placeholder-val="{{ false }}"><span style="display: flex; align-items: center">${rain(15, 2)}</span></sc-if>\n        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#97A5AA"`,
    )
    return withWetVals(text)
  })
}
edit('Bestiaire.dc.html', (text) => swap(text, 'BIOME 2 SUR 8 · 8 CRÉATURES</span>', 'BIOME 2 SUR 8 · 8 CRÉATURES{{ wetTag }}</span>'))

// The desktop: a chip under Ton monde in the sidebar; folded below 1400 px, its icon alone.
const DESKTOP_CHIP = `<button type="button" role="switch" aria-checked="{{ wetChecked }}" aria-label="Humide, dans la Forêt noire" onClick="{{ toggleWet }}" class="bw-chip" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 4px 8px 12px; box-sizing: border-box; border: 1px solid {{ wetBorder }}; border-radius: 6px; color: #E2E8E8; text-align: left">
        ${rain(18)}
        <span class="bw-label" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><span style="font-size: 14px">Humide</span><span style="font-family: 'IBM Plex Mono', monospace; font-size: 10px; line-height: 14px; color: #97A5AA; white-space: nowrap">FEU ×0,5<br>GLACE, FOUDRE ×1,5</span></span>
        <span class="bw-label" style="flex: none; width: 44px; height: 32px; display: flex; align-items: center; justify-content: center">${TRACK}</span>
      </button>
      `
for (const file of ['Desktop-Bestiaire.dc.html', 'Desktop-Combat.dc.html', 'Desktop-Arsenal.dc.html', 'Desktop-Arsenal-Recherche.dc.html', 'Desktop-Memo.dc.html']) {
  edit(file, (text) => withWetVals(swap(text, '<a href="Desktop-Reglages.dc.html"', `${DESKTOP_CHIP}<a href="Desktop-Reglages.dc.html"`)))
}
edit('Desktop-Bestiaire.dc.html', (text) => {
  text = swap(text, 'BIOME 2 SUR 8 · 8 CRÉATURES</span>', 'BIOME 2 SUR 8 · 8 CRÉATURES{{ wetTag }}</span>')
  return swap(text, 'FORÊT NOIRE</span>', 'FORÊT NOIRE{{ wetTag }}</span>')
})

// ——— Ton équipement: « Du groupe », the Magic barrier after Fader's power ——————————————————————————————————————————

for (const file of ['Profil.dc.html', 'Desktop-Equipement.dc.html']) {
  edit(file, (text) => {
    text = swap(text, '>POUVOIRS DU GROUPE</h3>', '>DU GROUPE</h3>')
    const fader = blockAround(text, '>Pouvoir de Fader<', '<div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px', '</div>')
    const barrier = swap(
      swap(swap(fader, '>POUVOIR</span>', '>BARRIÈRE MAGIQUE</span>'), '>Pouvoir de Fader<', '>Lancée avec Magie du sang 20<'),
      '<span style="white-space: nowrap">5 min · Feu ×0,5</span><span style="white-space: nowrap">tu titubes 2× moins vite</span>',
      '<span style="white-space: nowrap">1 à 4 min · absorbe 300</span>',
    )
    const indent = text.slice(text.lastIndexOf('\n', text.indexOf(fader)) + 1, text.indexOf(fader))
    text = swap(text, fader, `${fader}\n${indent}${barrier}`)
    return swap(
      text,
      'Ceux qu’un joueur lance à moins de 10 m de toi&nbsp;; à allumer comme les tiens.',
      'Ce qu’un joueur lance près de toi&nbsp;; à allumer comme les tiens. La Barrière dépend de la Magie du sang de qui la lance.',
    )
  })
}

// ——— The card « Avec tes effets temporaires »: the barrier, on the sheet and in the Simulation ——————————————————————

const FX_FADER = "{ id: 'fader', name: 'Pouvoir de Fader', tag: 'POUVOIR DU GROUPE · 5 MIN' }"
const FX_BARRIER = `${FX_FADER},\n      { id: 'barriere', name: 'Barrière magique', tag: 'DU GROUPE · ABSORBE 300 · 1 À 4 MIN' }`
const BARRIER_OF = `    // The Magic barrier, a group's (Staff_shield): 300 to absorb (Blood Magic 20). It counts the whole hit, the
    // Troll's chop (100) and pickaxe (40) too, scaled by the stars, and takes whole the hit that overflows it; the
    // verdicts stay those once it breaks.
    const shielded = this.state.fx.indexOf('barriere') !== -1;
    const barrierOf = (x) => {
      const counted = (x.a.dmg + 140) * mult;
      const hits = Math.floor(300 / counted) + 1;
      return { hasBarrier: shielded, barrier: 'Barrière : ' + hits + (hits > 1 ? ' coups' : ' coup') + ' (compte ' + fmt(counted, 0) + ')' };
    };
    const attacks = base.map((a) => {`
const BARRIER_LINE = '<sc-if value="{{ a.hasBarrier }}" hint-placeholder-val="{{ false }}"><span style="font-size: 12px; line-height: 16px; color: #97A5AA">{{ a.barrier }}</span></sc-if>'
for (const file of ['Monstre.dc.html', 'Desktop-Bestiaire.dc.html']) {
  edit(file, (text) => {
    text = swap(text, FX_FADER, FX_BARRIER)
    text = swap(text, '    const attacks = base.map((a) => {', BARRIER_OF)
    return swap(text, 'attacks: attacks.map((x) => Object.assign(typeVals(x.a.types), {', 'attacks: attacks.map((x) => Object.assign(typeVals(x.a.types), barrierOf(x), {')
  })
}
edit('Monstre.dc.html', (text) => {
  text = swap(text, '{{ a.t2 }}</sc-if> · {{ a.tags }}</span>', `{{ a.t2 }}</sc-if> · {{ a.tags }}</span>\n            ${BARRIER_LINE}`)
  return swap(text, "'. Esquivable. Ouvrir la simulation.'", "'. Esquivable. ' + (shielded ? barrierOf(x).barrier + '. ' : '') + 'Ouvrir la simulation.'")
})
edit('Desktop-Bestiaire.dc.html', (text) =>
  swap(text, '<span class="bw-range-tag"> · {{ a.range }}</span></span></span>', `<span class="bw-range-tag"> · {{ a.range }}</span></span>${BARRIER_LINE}</span>`))

// The Simulation: above the advice, how many such hits the barrier takes; the cards read what comes once it breaks.
const SHIELD_ICON = (size) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex: none"><circle cx="12" cy="12" r="9"></circle><path d="M7.5 12a4.5 4.5 0 0 1 4.5-4.5"></path></svg>`
const SIM_LINE = (size, gap, indent) =>
  `<sc-if value="{{ barrier.on }}" hint-placeholder-val="{{ false }}"><div style="flex: none; display: flex; align-items: center; gap: ${gap}px; font-size: ${size}px; line-height: 1.4; color: #97A5AA">${SHIELD_ICON(size + 3)}<span>{{ barrier.text }}</span></div></sc-if>\n${indent}`
const SIM_VALS = `      // The Magic barrier, a group's: 300 to absorb; it counts the whole hit, the Troll's chop and pickaxe (140) too.
      barrier: (() => {
        const counted = hit + 140 * [1, 1.5, 2][st.stars];
        const hits = Math.floor(300 / counted) + 1;
        return { on: on.indexOf('barriere') !== -1, text: 'Barrière magique : elle prend ' + hits + (hits > 1 ? ' coups' : ' coup') + ' comme celui-ci (compte ' + fmt(counted, 0) + '), puis :' };
      })(),
      isAttack: isAttack,
`
for (const [file, anchor, size, gap, indent] of [
  ['Main.dc.html', '<div style="flex: none; display: flex; align-items: center; gap: 8px; font-size: 15px; color: {{ advice.color }}">', 13, 8, '    '],
  ['Desktop-Combat.dc.html', '<div style="display: flex; align-items: center; gap: 10px; font-size: 18px; color: {{ advice.color }}">', 14, 10, '          '],
]) {
  edit(file, (text) => {
    text = swap(text, FX_FADER, FX_BARRIER)
    text = swap(text, anchor, SIM_LINE(size, gap, indent) + anchor)
    return swap(text, '      isAttack: isAttack,\n', SIM_VALS)
  })
}

for (const [file, text] of pending) writeFileSync(new URL(file, PROJECT), text, 'utf8')
console.log('wrote', [...pending.keys()].join(', '))
