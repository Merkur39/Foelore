// Adds the « Dégâts · pistes » page to canvas.json, after Nouveautés: today's reading, then each track with its desktop
// on its right.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const PAGE = 'degats'
const H = 1220
const ROW = H + 400
const DESKTOP_X = 1736 + 80

const entries = [
  ['Degats-Auj.dc.html', { x: 0, y: 0, w: 1736, h: H, title: 'Aujourd’hui · le haut du jet, sans le dire' }],
  ['Degats-A.dc.html', { x: 0, y: ROW, w: 1736, h: H, title: 'A · Des fourchettes, sur la carte' }],
  ['Degats-A-Desktop.dc.html', { x: DESKTOP_X, y: ROW, w: 1440, h: 900, title: 'A · desktop' }],
  ['Degats-B.dc.html', { x: 0, y: ROW * 2, w: 1736, h: H, title: 'B · « Jusqu’à », et une ligne' }],
  ['Degats-B-Desktop.dc.html', { x: DESKTOP_X, y: ROW * 2, w: 1440, h: 900, title: 'B · desktop' }],
  ['Degats-C.dc.html', { x: 0, y: ROW * 3, w: 1736, h: H, title: 'C · Le plus fort sur la carte, le détail replié' }],
  ['Degats-C-Desktop.dc.html', { x: DESKTOP_X, y: ROW * 3, w: 1440, h: 900, title: 'C · desktop' }],
  // Iteration 1 of C, the owner's pick, under the tracks; its folds open and close in Play.
  ['Degats-C1.dc.html', { x: 0, y: ROW * 4, w: 2580, h: H, title: 'Itération 1 · C, avec « Détails »', is_interactive: true }],
  ['Degats-C1-Desktop.dc.html', { x: 2580 + 80, y: ROW * 4, w: 1440, h: 900, title: 'Itération 1 · C · desktop', is_interactive: true }],
  // Iteration 2: the bars in « Détails ».
  ['Degats-C2.dc.html', { x: 0, y: ROW * 5, w: 2580, h: H, title: 'Itération 2 · C, les barres en fourchette', is_interactive: true }],
  ['Degats-C2-Desktop.dc.html', { x: 2580 + 80, y: ROW * 5, w: 1440, h: 900, title: 'Itération 2 · C · desktop', is_interactive: true }],
].map(([file, entry]) => [file, { ...entry, page: PAGE }])
const notes = {
  'degats-row1': { kind: 'title1', text: 'Dégâts · le jet du jeu, la brûlure et le poison (#64)', x: 0, y: -300, maxW: DESKTOP_X + 1440, page: PAGE },
  'degats-row2': { kind: 'title1', text: 'Itération 1 · C, avec « Détails »', x: 0, y: ROW * 4 - 300, maxW: 2580 + 80 + 1440, page: PAGE },
  'degats-row3': { kind: 'title1', text: 'Itération 2 · C, les barres en fourchette', x: 0, y: ROW * 5 - 300, maxW: 2580 + 80 + 1440, page: PAGE },
}

if (!index.pages.some((p) => p.id === PAGE)) {
  const at = index.pages.findIndex((p) => p.id === 'nouveautes') + 1
  index.pages.splice(at, 0, { id: PAGE, name: 'Dégâts · pistes' })
}
const names = new Set(entries.map(([file]) => file))
const kept = Object.entries(index.boards).filter(([file]) => !names.has(file))
const at = kept.findIndex(([file]) => file === 'Nouveautes-A1-Desktop.dc.html') + 1
index.boards = Object.fromEntries([...kept.slice(0, at), ...entries, ...kept.slice(at)])
index.order = Object.keys(index.boards)
const keptNotes = Object.entries(index.notes).filter(([key]) => !(key in notes))
const noteAt = keptNotes.findIndex(([key]) => key === 'nouveautes-row1') + 1
index.notes = Object.fromEntries([...keptNotes.slice(0, noteAt), ...Object.entries(notes), ...keptNotes.slice(noteAt)])
// The editor keeps its own order of the notes: ours go after Nouveautés', the others stay where they are.
if (Array.isArray(index.noteOrder)) {
  const order = index.noteOrder.filter((key) => !(key in notes))
  const after = order.indexOf('nouveautes-row1') + 1
  index.noteOrder = after > 0 ? [...order.slice(0, after), ...Object.keys(notes), ...order.slice(after)] : [...order, ...Object.keys(notes)]
}
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('pages', index.pages.length, 'boards', Object.keys(index.boards).length, 'notes', Object.keys(index.notes).length)
