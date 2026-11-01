// Writes what the Magic barrier's row of Ton équipement opens (#69), on the owner's word after track B was carried into
// Origine (v214): `Equipement-Barriere` and `Desktop-Equipement-Barriere`, in the frame of Ton équipement's lists, and
// links the row of `Profil` and `Desktop-Equipement` to them. The caster's Blood Magic in a − / + field, what the barrier
// absorbs (SE_Shield: 200 + 5 per level), « Valider » and « Retirer la barrière ». In Play, − and + update it.
// Run from this folder, once, then: sync_themes.py, check_canvas.py.
import { readFileSync, writeFileSync } from 'node:fs'

const PROJECT = new URL('../../canvas/project/', import.meta.url)
const read = (file) => readFileSync(new URL(file, PROJECT), 'utf8')
const pending = new Map()
function swap(text, from, to, count = 1) {
  const found = text.split(from).length - 1
  if (found !== count) throw new Error(`expected ${count} of ${JSON.stringify(from.slice(0, 80))}, found ${found}`)
  return text.replaceAll(from, to)
}

const MONO = "font-family: 'IBM Plex Mono', monospace"
const MINUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"></path></svg>'
const PLUS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>'
const LEDE = 'Le Bâton de protection la pose sur qui le lance et sur les joueurs à moins de 5&nbsp;m, pour 1 à 4&nbsp;min selon son niveau. Tu l’allumes ensuite sur la fiche d’une créature ou dans la Simulation.'
const HOW = '200, plus 5 par niveau de Magie du sang. Elle compte tout le coup, hache et pioche comprises, et absorbe en entier celui qui la brise.'
const LOGIC = `class Component extends DCLogic {
  constructor(props) {
    super(props);
    this.state = { blood: 20 };
  }
  // SE_Shield: 200, plus 5 per Blood Magic level of the caster.
  renderVals() {
    const blood = this.state.blood;
    const set = (value) => this.setState({ blood: Math.max(0, Math.min(100, value)) });
    return { blood: String(blood), absorb: String(200 + 5 * blood), less: () => set(blood - 1), more: () => set(blood + 1) };
  }
}`
const withLogic = (page) => page.replace(/class Component extends DCLogic \{[\s\S]*?\n\}\n<\/script>/, `${LOGIC}\n</script>`)
const field = (background) =>
  `<div style="display: flex; flex-direction: column; gap: 6px">
        <label for="b-blood" style="font-size: 11px; letter-spacing: 0.08em; color: #97A5AA">MAGIE DU SANG DE QUI LA LANCE</label>
        <div style="display: flex; align-items: center; border: 1px solid #2C383D; border-radius: 4px; background: ${background}">
          <button type="button" onClick="{{ less }}" aria-label="Moins de Magie du sang" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center">${MINUS}</button>
          <input id="b-blood" type="text" inputmode="numeric" value="{{ blood }}" style="flex: 1; min-width: 0; width: 100%; height: 44px; text-align: center; background: transparent; border: 0; ${MONO}; font-size: 17px">
          <button type="button" onClick="{{ more }}" aria-label="Plus de Magie du sang" style="width: 44px; height: 44px; display: flex; align-items: center; justify-content: center">${PLUS}</button>
        </div>
      </div>`
const absorbs = (background) =>
  `<div style="display: flex; flex-direction: column; gap: 4px; padding: 12px; border: 1px solid #2C383D; border-radius: 6px; background: ${background}">
        <span style="font-size: 11px; letter-spacing: 0.08em; color: #97A5AA">ELLE ABSORBE</span>
        <span style="${MONO}; font-size: 24px">{{ absorb }}</span>
        <span style="font-size: 12px; line-height: 1.45; color: #7D8B91">${HOW}</span>
      </div>`

// ——— The phone: the frame of « Ton bibelot » ——————————————————————————————————————————————————————————————————————

{
  let page = read('Equipement-Bibelot.dc.html')
  page = page.replace(/<title>.*?<\/title>/, '<title>Ton équipement — la barrière magique</title>')
  page = swap(page, '>Ton bibelot</h2></span>', '>Barrière magique</h2></span>')
  page = swap(page, '\n    <span style="font-family: \'IBM Plex Mono\', monospace; font-size: 12px; color: #7D8B91">4 bibelots</span>', '')
  const mainStart = page.indexOf('  <main ')
  const mainEnd = page.indexOf('  </main>') + '  </main>'.length
  const body = `  <main style="flex: 1; min-height: 0; padding: 16px; display: flex; flex-direction: column; gap: 18px">
      <p style="margin: 0; font-size: 13px; line-height: 1.45; color: #97A5AA">${LEDE}</p>
      ${field('#151C1F')}
      ${absorbs('#151C1F')}
  </main>

  <footer style="display: flex; flex-direction: column; gap: 4px; padding: 12px 16px 24px; border-top: 1px solid #2C383D">
    <a href="Profil.dc.html" style="display: flex; align-items: center; justify-content: center; height: 48px; border-radius: 4px; background: #8EBDE3; color: #0D1214; font-weight: 500; text-decoration: none">Valider</a>
    <a href="Profil.dc.html" style="display: flex; align-items: center; justify-content: center; height: 44px; font-size: 14px; color: #8EBDE3; text-decoration: none">Retirer la barrière</a>
  </footer>`
  page = page.slice(0, mainStart) + body + page.slice(mainEnd)
  pending.set('Equipement-Barriere.dc.html', withLogic(page))
}

// ——— The desktop: the dialog of Ton équipement, with the back arrow of its lists ———————————————————————————————————

{
  let page = read('Desktop-Equipement.dc.html')
  const back = read('Desktop-Equipement-Bibelot.dc.html')
  const backLink = back.slice(back.indexOf('<a href="Desktop-Equipement.dc.html" aria-label="Retour'), back.indexOf('</a>', back.indexOf('<a href="Desktop-Equipement.dc.html" aria-label="Retour')) + 4)
  page = page.replace(/<title>.*?<\/title>/, '<title>Ton équipement — la barrière magique</title>')
  page = swap(
    page,
    '<h2 id="d-title" style="margin: 0; flex: 1; font-size: 18px; font-weight: 500">Ton équipement</h2>',
    `${backLink}<span style="flex: 1; display: flex; align-items: baseline; gap: 8px"><span style="font-size: 14px; color: #7D8B91">Ton équipement ·</span><h2 id="d-title" style="margin: 0; font-size: 18px; font-weight: 500">Barrière magique</h2></span>`,
  )
  const bodyStart = page.indexOf('      <div style="flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: grid;')
  const footerStart = page.indexOf('      <footer ')
  const footerEnd = page.indexOf('      </footer>') + '      </footer>'.length
  const body = `      <div style="flex: 1; min-height: 0; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 20px">
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #97A5AA">${LEDE}</p>
      ${field('#0D1214')}
      ${absorbs('#0D1214')}
      </div>

      <footer style="display: flex; align-items: center; gap: 10px; padding: 16px 24px; border-top: 1px solid #2C383D">
        <a href="Desktop-Equipement.dc.html" style="display: inline-flex; align-items: center; height: 40px; font-size: 14px; color: #8EBDE3; text-decoration: none">Retirer la barrière</a>
        <span style="flex: 1"></span>
        <a href="Desktop-Equipement.dc.html" style="display: inline-flex; align-items: center; height: 40px; padding: 0 20px; border-radius: 4px; font-size: 14px; font-weight: 500; background: #8EBDE3; color: #0D1214; text-decoration: none">Valider</a>
      </footer>`
  page = page.slice(0, bodyStart) + body + page.slice(footerEnd)
  if (footerStart < bodyStart) throw new Error('footer before body')
  pending.set('Desktop-Equipement-Barriere.dc.html', withLogic(page))
}

// ——— The barrier's row of Ton équipement opens it ————————————————————————————————————————————————————————————————

for (const [file, target] of [['Profil.dc.html', 'Equipement-Barriere.dc.html'], ['Desktop-Equipement.dc.html', 'Desktop-Equipement-Barriere.dc.html']]) {
  let text = read(file)
  const head = '<span style="display: flex; flex-direction: column; gap: 1px"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">BARRIÈRE MAGIQUE</span>'
  text = swap(text, head, `<a href="${target}" aria-label="Barrière magique&nbsp;: lancée avec Magie du sang 20" style="display: flex; flex-direction: column; gap: 1px; color: inherit; text-decoration: none"><span style="font-size: 10px; line-height: 13px; letter-spacing: 0.08em; color: #97A5AA">BARRIÈRE MAGIQUE</span>`)
  const name = text.indexOf('>Lancée avec Magie du sang 20</span>')
  const close = text.indexOf('</span></span>\n', name)
  text = text.slice(0, close) + '</span></a>\n' + text.slice(close + '</span></span>\n'.length)
  pending.set(file, text)
}

for (const [file, text] of pending) writeFileSync(new URL(file, PROJECT), text, 'utf8')
console.log('wrote', [...pending.keys()].join(', '))
