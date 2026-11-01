import type { Gear } from '@/app/store'
import { categorySize } from '@/features/arsenal/model'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { HAND, keyOf, listOf, type GearList } from './lists'

/** A list's title, and how many it holds, for the header of Your gear while it shows. */
export function useListHeading() {
  const t = useT()
  const language = useLanguage()
  return (gear: Gear, list: GearList): { readonly title: string; readonly aside: string } => {
    const { category, choices } = listOf(gear, list)
    const key = keyOf(list)
    const aside =
      key === 'hand'
        ? formatNumber(
            HAND.reduce((sum, option) => sum + categorySize(option), 0),
            language,
          )
        : key === 'moreDrink' || key === 'moreGroup'
          ? t.lists.countOf(choices?.length ?? 0, categorySize(category))
          : t.lists.count(categorySize(category), t.arsenal.categories[category])
    return { title: t.lists.titles[key], aside }
  }
}
