// Carries iteration 1 of track B (#79, approved on 2026-11-01, v210) into the Origine boards, once: Ton équipement
// gains « Pouvoirs du groupe » under « Ce que tu emportes » (Fader's power, a friend's); the card « Avec tes effets
// temporaires » of the sheet and the Simulation gains it after the drinks, « POUVOIR DU GROUPE · 5 MIN », counted as the
// engine counts it (Character.AddStaggerDamage: the stagger at the shield and at the armor, ×0,5); the Arsenal tags
// one's own power ÉQUIPÉ (« Équiper ») and the group's DU GROUPE, at the head of the powers.
// Run from this folder, once, then: build_bestiary_search.py, sync_themes.py, check_canvas.py.
import { readFileSync, writeFileSync } from 'node:fs'

const PROJECT = new URL('../../canvas/project/', import.meta.url)
const read = (file) => readFileSync(new URL(file, PROJECT), 'utf8')
// Every board is checked before any is written: one that does not hold what it should stops them all.
const pending = new Map()
const write = (file, text) => pending.set(file, text)
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

const FADER = 'Pouvoir de Fader'
const FADER_LINES = ['5 min · Feu ×0,5', 'tu titubes 2× moins vite']
const GROUP_NOTE = 'Ceux qu’un joueur lance à moins de 10 m de toi&nbsp;; à allumer comme les tiens.'

// ——— Ton équipement: « Pouvoirs du groupe » under « Ce que tu emportes » ————————————————————————————————————————

function withGroup(file, carryId, groupId) {
  let text = read(file)
  const section = blockAround(text, `aria-labelledby="${carryId}"`, '<section', '</section>')
  const powerRow = blockAround(section, ">Masse-d'Os<", '<div style="display: flex; flex-direction: column; gap: 2px; padding: 5px 10px 6px', '</div>')
  const faderRow = swap(
    swap(powerRow, ">Masse-d'Os<", `>${FADER}<`),
    `<span style="white-space: nowrap">5 min · Contondant, Coupant et Perforant ×0,75</span><span style="white-space: nowrap">bloquer rend 5 d'endurance</span>`,
    FADER_LINES.map((line) => `<span style="white-space: nowrap">${line}</span>`).join(''),
  )
  const addDrink = blockAround(section, '>Ajouter une boisson', '<a href=', '</a>')
  const addGroup = swap(
    swap(swap(addDrink.replace(/^<a href="[^"]+" style="/, '<button type="button" style="'), '</a>', '</button>'), 'Ajouter une boisson', 'Ajouter un pouvoir du groupe'),
    'text-align: left; text-decoration: none',
    'text-align: left',
  )
  const boxOpen = section.slice(section.indexOf('<div style="border: 1px solid #2C383D; border-radius: 4px; overflow: hidden;'), section.indexOf('>', section.indexOf('<div style="border: 1px solid #2C383D; border-radius: 4px; overflow: hidden;')) + 1)
  const note = blockAround(section, "Pas comptés d'office", '<p ', '</p>')
  const groupNote = note.replace(/>[^<]*<\/p>$/, `>${GROUP_NOTE}</p>`)
  const head = section.slice(0, section.indexOf('</h3>') + '</h3>'.length)
  const groupHead = swap(swap(swap(head, `aria-labelledby="${carryId}"`, `aria-labelledby="${groupId}"`), `id="${carryId}"`, `id="${groupId}"`), 'CE QUE TU EMPORTES', 'POUVOIRS DU GROUPE')
  const indent = file.startsWith('Desktop') ? '          ' : '        '
  const group = `${groupHead}\n${indent}${boxOpen}\n${indent}  ${faderRow.trim()}\n${indent}  ${addGroup.trim()}\n${indent}</div>\n${indent}${groupNote.trim()}\n${indent.slice(2)}</section>`
  text = swap(text, section, `${section}\n${indent.slice(2)}${group}`)
  write(file, text)
}
withGroup('Profil.dc.html', 'q-carry', 'q-group')
withGroup('Desktop-Equipement.dc.html', 'e-carry', 'e-group')

// ——— The card « Avec tes effets temporaires », on the sheet and in the Simulation ———————————————————————————————

const FX_GEL = "{ id: 'gel', name: 'Hydromel de résistance au gel', tag: 'BOISSON · 10 MIN' }"
const FX_FADER = `${FX_GEL},\n      { id: 'fader', name: '${FADER}', tag: 'POUVOIR DU GROUPE · 5 MIN' }`

// The sheet: Fader's power halves the stagger at the shield and at the armor.
for (const file of ['Monstre.dc.html', 'Desktop-Bestiaire.dc.html']) {
  let text = read(file)
  text = swap(text, FX_GEL, FX_FADER)
  text = swap(
    text,
    `    // What is on in « Avec tes effets temporaires »: the Brooch's armor, Bonemass's blunt resistance past the shield.
    const on = this.state.fx;
    const fxArmor = on.indexOf('broche') !== -1 ? 20 : 0, fxBlunt = on.indexOf('masse') !== -1 ? 0.75 : 1;
    const verdict = (hit, power) => {
      const passes = armor(hit, power);
      if (passes >= T) return 'bad';
      return passes + armor(passes * fxBlunt, ac + fxArmor) >= T ? 'warn' : 'ok';
    };`,
    `    // What is on in « Avec tes effets temporaires »: the Brooch's armor, Bonemass's blunt resistance past the shield,
    // and Fader's power, a friend's, which halves the stagger at the shield and at the armor (Character.AddStaggerDamage).
    const on = this.state.fx;
    const fxArmor = on.indexOf('broche') !== -1 ? 20 : 0, fxBlunt = on.indexOf('masse') !== -1 ? 0.75 : 1;
    const fxStagger = on.indexOf('fader') !== -1 ? 0.5 : 1;
    const verdict = (hit, power) => {
      const passes = armor(hit, power);
      if (passes * fxStagger >= T) return 'bad';
      return (passes + armor(passes * fxBlunt, ac + fxArmor)) * fxStagger >= T ? 'warn' : 'ok';
    };`,
  )
  write(file, text)
}

// The Simulation: the same, on the bar.
for (const file of ['Main.dc.html', 'Desktop-Combat.dc.html']) {
  let text = read(file)
  text = swap(text, FX_GEL, FX_FADER)
  text = swap(
    text,
    `    // What is on in « Avec tes effets temporaires », for an attack: the Brooch's armor, Bonemass's blunt resistance
    // past the shield and its block stamina.
    const on = isAttack ? st.fx : [];
    const fxArmor = on.indexOf('broche') !== -1 ? 20 : 0;
    const masse = on.indexOf('masse') !== -1;
    const fxBlunt = masse ? 0.75 : 1, fxShare = masse ? -1 : 0, fxFlat = masse ? -5 : 0;`,
    `    // What is on in « Avec tes effets temporaires », for an attack: the Brooch's armor, Bonemass's blunt resistance
    // past the shield and its block stamina, and Fader's power, a friend's, which halves the stagger at the shield and
    // at the armor (Character.AddStaggerDamage).
    const on = isAttack ? st.fx : [];
    const fxArmor = on.indexOf('broche') !== -1 ? 20 : 0;
    const masse = on.indexOf('masse') !== -1;
    const fxBlunt = masse ? 0.75 : 1, fxShare = masse ? -1 : 0, fxFlat = masse ? -5 : 0;
    const fxStagger = on.indexOf('fader') !== -1 ? 0.5 : 1;`,
  )
  text = swap(text, '      const broke = bar0 + passes >= T;', '      const broke = bar0 + passes * fxStagger >= T;')
  text = swap(text, '      const staggered = broke || bar0 + passes + shown >= T;', '      const staggered = broke || bar0 + (passes + shown) * fxStagger >= T;')
  text = swap(text, '      const segs = [bar0, passes, shown].reduce(', '      const segs = [bar0, passes * fxStagger, shown * fxStagger].reduce(')
  text = swap(text, '      const total = Math.min(T, bar0 + passes + shown);', '      const total = Math.min(T, bar0 + (passes + shown) * fxStagger);')
  write(file, text)
}

// ——— The Arsenal: one's own power ÉQUIPÉ, the group's DU GROUPE, at the head ————————————————————————————————————

const CARRIED_TAG = `<sc-if value="{{ r.carried }}" hint-placeholder-val="{{ false }}"><span style="flex: none; font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid #8EBDE3; color: #8EBDE3">EMPORTÉ</span></sc-if>`
const TAGS = `<sc-if value="{{ r.carried }}" hint-placeholder-val="{{ false }}"><span style="flex: none; font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid #8EBDE3; color: #8EBDE3">{{ r.carriedTag }}</span></sc-if><sc-if value="{{ r.group }}" hint-placeholder-val="{{ false }}"><span style="flex: none; font-family: 'IBM Plex Mono', monospace; font-size: 10px; padding: 1px 5px; border-radius: 3px; border: 1px solid #2C383D; color: #97A5AA">DU GROUPE</span></sc-if>`
for (const [file, tags] of [['Arsenal.dc.html', 1], ['Desktop-Arsenal.dc.html', 2]]) {
  let text = read(file)
  text = swap(text, CARRIED_TAG, TAGS, tags)
  const data = text.match(/const DATA = (\{.*?\});\n/)
  const DATA = JSON.parse(data[1])
  const powers = DATA.power
  const own = powers.find((p) => p.name === "Masse-d'Os")
  const fader = powers.find((p) => p.name === FADER)
  if (!own?.carried || !fader) throw new Error(`${file}: powers not as expected`)
  fader.group = true
  DATA.power = [own, fader, ...powers.filter((p) => p !== own && p !== fader)]
  text = swap(text, data[0], `const DATA = ${JSON.stringify(DATA)};\n`)
  text = swap(
    text,
    "        label: r.name + (r.equipped ? ', équipé' : r.carried ? ', emporté' : '') + '. Ouvrir dans Ton équipement.',",
    `        // One's own power is equipped, the group's are tagged apart (#79); a trinket or a drink is carried.
        group: !!r.group,
        carriedTag: cat === 'power' ? 'ÉQUIPÉ' : 'EMPORTÉ',
        label: r.name + (r.equipped || (r.carried && cat === 'power') ? ', équipé' : r.carried ? ', emporté' : r.group ? ', du groupe' : '') + '. Ouvrir dans Ton équipement.',`,
  )
  text = swap(
    text,
    `        doneText: r.k === 'e' ? 'Emporté' : 'Équipé',
        verb: r.k === 'e' ? 'Emporter' : 'Équiper',
        verbLabel: (r.k === 'e' ? 'Emporter' : 'Équiper') + '\\u00a0: ' + r.name`,
    `        doneText: r.k === 'e' && cat !== 'power' ? 'Emporté' : 'Équipé',
        verb: r.k === 'e' && cat !== 'power' ? 'Emporter' : 'Équiper',
        verbLabel: (r.k === 'e' && cat !== 'power' ? 'Emporter' : 'Équiper') + '\\u00a0: ' + r.name`,
  )
  if (file === 'Desktop-Arsenal.dc.html')
    text = swap(
      text,
      `          : "Lu dans le jeu\\u00a0: les pouvoirs, et les bibelots et boissons qui changent un combat. L'emporter l'ajoute à Ton équipement\\u00a0; tu l'allumes sur la fiche d'une créature ou dans la Simulation."`,
      `          : cat === 'power'
            ? "Lu dans le jeu\\u00a0: les pouvoirs, et les bibelots et boissons qui changent un combat. Équiper un pouvoir en fait le tien dans Ton équipement\\u00a0; tu l'allumes sur la fiche d'une créature ou dans la Simulation."
            : "Lu dans le jeu\\u00a0: les pouvoirs, et les bibelots et boissons qui changent un combat. L'emporter l'ajoute à Ton équipement\\u00a0; tu l'allumes sur la fiche d'une créature ou dans la Simulation."`,
    )
  write(file, text)
}

for (const [file, text] of pending) {
  writeFileSync(new URL(file, PROJECT), text, 'utf8')
  console.log(file, text.length)
}
