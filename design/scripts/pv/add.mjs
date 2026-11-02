// Adds the « PV et ton monde · pistes » page to canvas.json, after Encaisses: the three tracks, one under the other,
// and track A on a desktop right of its phones.
import { readFileSync, writeFileSync } from 'node:fs'

const path = new URL('../../canvas/project/canvas.json', import.meta.url)
const index = JSON.parse(readFileSync(path, 'utf8'))
const PAGE = 'pv'
const H = 1300
const ROW = H + 400

const entries = [
  ['PV-A.dc.html', { x: 0, y: 0, w: 1314, h: H, title: 'A · Les PV dans l’unité de tes coups' }],
  // Track A on a desktop, the owner's pick, right of its phones.
  ['PV-A-Desktop.dc.html', { x: 1314 + 80, y: 0, w: 1440, h: 900, title: 'A · desktop · Difficile, 3 joueurs' }],
  ['PV-B.dc.html', { x: 0, y: ROW, w: 1314, h: H, title: 'B · Ce qu’il faut infliger, les PV du jeu dessous' }],
  ['PV-C.dc.html', { x: 0, y: ROW * 2, w: 1314, h: H, title: 'C · Les PV du jeu, une ligne explique' }],
].map(([file, entry]) => [file, { ...entry, page: PAGE }])
const notes = {
  'pv-row1': { kind: 'title1', text: 'PV et ton monde · les PV dans la même unité qu’À infliger (#84)', x: 0, y: -300, maxW: 1314 + 80 + 1440, page: PAGE },
}

if (!index.pages.some((p) => p.id === PAGE)) {
  const at = index.pages.findIndex((p) => p.id === 'encaisses') + 1
  index.pages.splice(at, 0, { id: PAGE, name: 'PV et ton monde · pistes' })
}
const names = new Set(entries.map(([file]) => file))
const kept = Object.entries(index.boards).filter(([file]) => !names.has(file))
const at = kept.findIndex(([file]) => file === 'Encaisses.dc.html') + 1
index.boards = Object.fromEntries([...kept.slice(0, at), ...entries, ...kept.slice(at)])
index.order = Object.keys(index.boards)
const keptNotes = Object.entries(index.notes).filter(([key]) => !(key in notes))
const noteAt = keptNotes.findIndex(([key]) => key === 'encaisses-row1') + 1
index.notes = Object.fromEntries([...keptNotes.slice(0, noteAt), ...Object.entries(notes), ...keptNotes.slice(noteAt)])
// The editor keeps its own order of the notes: ours go after Encaisses', the others stay.
if (Array.isArray(index.noteOrder)) {
  const order = index.noteOrder.filter((key) => !(key in notes))
  const after = order.indexOf('encaisses-row1') + 1
  index.noteOrder = after > 0 ? [...order.slice(0, after), ...Object.keys(notes), ...order.slice(after)] : [...order, ...Object.keys(notes)]
}
writeFileSync(path, JSON.stringify(index, null, 2) + '\n', 'utf8')
console.log('pages', index.pages.length, 'boards', Object.keys(index.boards).length, 'notes', Object.keys(index.notes).length)
