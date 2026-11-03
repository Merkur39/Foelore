import { useLayoutEffect, useRef, type RefObject } from 'react'

/**
 * The scroll of a body that shows, in its page's place, a page reached from it (a row's list in Your
 * gear): that one opens at its top, and going back finds the page where it was left. Returns the
 * body's scroll handler.
 */
export function useReturnScroll(bodyRef: RefObject<HTMLElement | null>, reached: boolean) {
  // Taken as the player scrolls, not as the page gives way: by then the other has replaced it, and the
  // browser may have pulled the scroll back within it.
  const left = useRef(0)

  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = reached ? 0 : left.current
  }, [bodyRef, reached])

  return () => {
    if (!reached && bodyRef.current) left.current = bodyRef.current.scrollTop
  }
}
