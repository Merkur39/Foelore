// Adds the « Pouvoirs · pistes » page to canvas.json, after Encaisses: today's single power, each track, then the
// iterations of the one picked.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const PAGE = 'pouvoirs'
const H = 1240
const ROW = H + 400

const entries = [
  ['Pouvoirs-Auj.dc.html', { x: 0, y: 0, w: 1314, h: H, title: 'Aujourd’hui · un seul pouvoir' }],
  ['Pouvoirs-A.dc.html', { x: 0, y: ROW, w: 1736, h: H, title: 'A · Des pouvoirs, comme les boissons' }],
  ['Pouvoirs-B.dc.html', { x: 0, y: ROW * 2, w: 1736, h: H, title: 'B · Le tien, et ceux du groupe' }],
  ['Pouvoirs-C.dc.html', { x: 0, y: ROW * 3, w: 1736, h: H, title: 'C · Ceux du groupe, sur la fiche' }],
  // Iteration 1 of B, the owner's pick, under the tracks; the Lox's card answers in Play.
  ['Pouvoirs-B1.dc.html', { x: 0, y: ROW * 4, w: 2158, h: H, title: 'Itération 1 · B, le tien et ceux du groupe', is_interactive: true }],
  ['Pouvoirs-B1-Desktop.dc.html', { x: 2158 + 80, y: ROW * 4, w: 1440, h: 900, title: 'Itération 1 · B · desktop' }],
  // The owner's feedback on it: the Arsenal's powers, and three wordings for a group's power that makes a drink useless.
  ['Pouvoirs-B1-Retours.dc.html', { x: 0, y: ROW * 5, w: 1736, h: H, title: 'Itération 1 · B, l’Arsenal et la raison' }],
  ['Pouvoirs-B1-Arsenal-Desktop.dc.html', { x: 1736 + 80, y: ROW * 5, w: 1440, h: 900, title: 'Itération 1 · B · l’Arsenal, desktop' }],
].map(([file, entry]) => [file, { ...entry, page: PAGE }])
const notes = {
  'pouvoirs-row1': { kind: 'title1', text: 'Pouvoirs · plusieurs à la fois, comme un groupe les partage (#79)', x: 0, y: -300, maxW: 1736, page: PAGE },
  'pouvoirs-row2': { kind: 'title1', text: 'Itération 1 · B, le tien et ceux du groupe', x: 0, y: ROW * 4 - 300, maxW: 2158 + 80 + 1440, page: PAGE },
  'pouvoirs-row3': { kind: 'title1', text: 'Itération 1 · l’Arsenal, et la raison', x: 0, y: ROW * 5 - 300, maxW: 1736 + 80 + 1440, page: PAGE },
}

if (!index.pages.some((p) => p.id === PAGE)) {
  const at = index.pages.findIndex((p) => p.id === 'encaisses') + 1
  index.pages.splice(at, 0, { id: PAGE, name: 'Pouvoirs · pistes' })
}
const names = new Set(entries.map(([file]) => file))
const kept = Object.entries(index.boards).filter(([file]) => !names.has(file))
const at = kept.findIndex(([file]) => file === 'Encaisses.dc.html') + 1
index.boards = Object.fromEntries([...kept.slice(0, at), ...entries, ...kept.slice(at)])
index.order = Object.keys(index.boards)
const keptNotes = Object.entries(index.notes).filter(([key]) => !(key in notes))
const noteAt = keptNotes.findIndex(([key]) => key.startsWith('pouvoirs-') || key === 'encaisses-row1') + 1
index.notes = Object.fromEntries([...keptNotes.slice(0, noteAt), ...Object.entries(notes), ...keptNotes.slice(noteAt)])
// The editor keeps its own order of the notes: ours go where the page's first one was, the others stay.
if (Array.isArray(index.noteOrder)) {
  const order = index.noteOrder.filter((key) => !(key in notes))
  const after = index.noteOrder.findIndex((key) => key.startsWith('pouvoirs-'))
  index.noteOrder = after > 0 ? [...order.slice(0, after), ...Object.keys(notes), ...order.slice(after)] : [...order, ...Object.keys(notes)]
}
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('pages', index.pages.length, 'boards', Object.keys(index.boards).length, 'notes', Object.keys(index.notes).length)
