import { useId, useRef } from 'react'
import { useT } from '@/i18n/useT'
import { useWet } from '@/features/weather/wet'
import { ChevronDownIcon, RainIcon, ShieldIcon, WorldIcon } from '@/ui/icons'
import { enemyScale, gearBlockPower } from './context'
import { ContextChips } from './ContextChips'
import styles from './ContextMenu.module.css'
import { useAppState } from './useAppState'

/** Phone: the two numbers every verdict hangs on, block power and enemy scale, in the top bar; they open
 * « Ton équipement » and « Ton monde » in a sheet from the bottom. A modal dialog: the browser keeps
 * the page inert behind it and closes it on Escape or Back; a tap on the shade or a pick closes it too. */
export function ContextMenu() {
  const t = useT()
  const { gear, world } = useAppState()
  const sheet = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const power = gearBlockPower(gear)
  const scale = enemyScale(world)
  const wet = useWet().on

  return (
    <div className={styles.contextMenu}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label={t.shell.contextSummary(power, scale, wet)}
        className={styles.summary}
        onClick={() => sheet.current?.showModal()}
      >
        <span className={styles.value}>
          <ShieldIcon size={15} strokeWidth={2} className={styles.icon} />
          {t.shell.contextPower(power)}
        </span>
        <span className={styles.value}>
          <WorldIcon size={15} strokeWidth={2} className={styles.icon} />
          {t.shell.contextScale(scale)}
        </span>
        {wet && <RainIcon size={15} strokeWidth={2} className={styles.icon} />}
        <ChevronDownIcon size={16} strokeWidth={2} className={styles.chevron} />
      </button>
      <dialog
        ref={sheet}
        aria-labelledby={titleId}
        className={styles.sheet}
        onClick={(event) => {
          // The shade is the dialog itself, its content filling the box; a pick closes the sheet
          // before its own dialog opens.
          const target = event.target as Element
          if (target === event.currentTarget || target.closest('a')) sheet.current?.close()
        }}
      >
        <div className={styles.content}>
          <span className={styles.handle} aria-hidden="true" />
          <header className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              {t.shell.context}
            </h2>
            <span className={styles.note}>{t.shell.contextNote}</span>
          </header>
          <ContextChips variant="sheet" />
        </div>
      </dialog>
    </div>
  )
}
