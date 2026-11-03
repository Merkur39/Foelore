import { useId, useLayoutEffect, useRef, type ReactNode } from 'react'
import { useIsDesktop } from '@/app/useMediaQuery'
import { BackIcon, CloseIcon } from './icons'
import styles from './Modal.module.css'
import { useReturnScroll } from './useReturnScroll'

interface ModalProps {
  readonly title: string
  /** Where the dialog stands, above its title on a phone, before it on a desktop: « Ton équipement ›
   * Ta cape ». */
  readonly kicker?: string
  /** A word at the end of the header, before the close button: how many a list holds. */
  readonly aside?: string
  /** The dialog's own language, when it shows another than the app's (the Settings preview the
   * language picked). */
  readonly lang?: string
  readonly closeLabel: string
  /** Save, and on a desktop Cancel next to it; a dialog without one closes from its header only. */
  readonly footer?: {
    readonly cancel: string
    readonly save: string
    readonly onSave: () => void
  }
  /** A page reached from another dialog: its back button replaces the close button on a phone, and
   * comes before the title on a desktop. Reached from the dialog's own page, in its place, it opens at
   * its top, and going back finds that page where it was left. */
  readonly back?: { readonly label: string; readonly onBack: () => void }
  /** A dialog that only shows: on a desktop, one button at its foot closes it. */
  readonly done?: string
  /** The width of the desktop dialog. Wide: two columns, its body laid out by its content. List: as wide
   * and tall as the screen lets a table be. */
  readonly size?: 'narrow' | 'medium' | 'default' | 'wide' | 'list'
  /** Every way out ends here: Save, Cancel, the close button, Escape. */
  readonly onClose: () => void
  readonly children: ReactNode
}

/** A modal dialog: full screen on a phone, centred on a desktop. The browser keeps the rest of the
 * page inert behind it and closes it on Escape. */
export function Modal({
  title,
  kicker,
  aside,
  lang,
  closeLabel,
  footer,
  back,
  done,
  size = 'default',
  onClose,
  children,
}: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const isDesktop = useIsDesktop()
  const body = useRef<HTMLDivElement>(null)
  const onScroll = useReturnScroll(body, back !== undefined)

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()

  return (
    <dialog
      ref={dialog}
      className={`${styles.modal ?? ''} ${styles[size] ?? ''}`}
      aria-labelledby={titleId}
      lang={lang}
      onClose={onClose}
    >
      <header className={styles.header}>
        {back && (
          <button
            type="button"
            className={styles.back}
            aria-label={back.label}
            onClick={back.onBack}
          >
            <BackIcon size={isDesktop ? 20 : 22} />
          </button>
        )}
        <span className={styles.titles}>
          {kicker && <span className={styles.kicker}>{kicker}</span>}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </span>
        {aside && <span className={styles.aside}>{aside}</span>}
        {(!back || isDesktop) && (
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={close}>
            <CloseIcon size={isDesktop ? 20 : 22} />
          </button>
        )}
      </header>
      <div ref={body} className={styles.body} onScroll={onScroll}>
        {children}
      </div>
      {done && isDesktop && (
        <footer className={styles.footer}>
          <button type="button" className={styles.cancel} onClick={close}>
            {done}
          </button>
        </footer>
      )}
      {footer && (
        <footer className={styles.footer}>
          {isDesktop && (
            <button type="button" className={styles.cancel} onClick={close}>
              {footer.cancel}
            </button>
          )}
          <button
            type="button"
            className={styles.save}
            onClick={() => {
              footer.onSave()
              close()
            }}
          >
            {footer.save}
          </button>
        </footer>
      )}
    </dialog>
  )
}
