import { useState } from 'react'
import { blockerOf } from '@/app/context'
import type { Gear } from '@/app/store'
import { useIsDesktop } from '@/app/useMediaQuery'
import { Cards, CategoryTable, SearchField, type NoneRow } from '@/features/arsenal/lists'
import { categorySize, holds, keepRows, rowsOf } from '@/features/arsenal/model'
import type { Catalog } from '@/i18n/fr'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { effectOf, NOTHING_CARRIED } from './carried'
import { HAND, keyOf, listOf, UNARMED, type GearList } from './lists'
import { leveled } from './model'
import styles from './GearLists.module.css'

function noteOf(t: Catalog, gear: Gear, list: GearList, language: 'fr' | 'en'): string {
  const carried = gear.carried ?? NOTHING_CARRIED
  switch (list.kind) {
    case 'hand':
      return t.lists.handNote(gear.skill, leveled(blockerOf(gear.blocker)) ? gear.level : null)
    case 'piece':
      return t.lists.pieceNote(list.slot, gear.pieces?.[list.slot]?.level ?? null)
    case 'trinket':
      return t.lists.oneAtATime(carried.trinket !== null)
    case 'power':
      return t.lists.oneAtATime(carried.power !== null)
    case 'drink': {
      const drink = list.index === null ? undefined : carried.drinks[list.index]
      return drink === undefined
        ? t.lists.drinkOnce(carried.drinks.map((id) => effectOf(id).name[language]))
        : t.lists.drinkSwap(effectOf(drink).name[language])
    }
    case 'group': {
      const power = list.index === null ? undefined : carried.group[list.index]
      return power === undefined
        ? t.lists.groupOnce(
            carried.power === null ? null : effectOf(carried.power).name[language],
            carried.group.map((id) => effectOf(id).name[language]),
          )
        : t.lists.groupSwap(effectOf(power).name[language])
    }
  }
}

/**
 * A row of Your gear's list, in its place while it shows: the Arsenal's rows of its category, what the
 * row holds first and « Aucun … » at their head to take it off, with a search; what is held switches
 * between the shields, the weapons and the rest. Picking one, or « Aucun … », goes back to Your gear.
 */
export function GearListView({
  gear,
  list,
  onPick,
}: {
  readonly gear: Gear
  readonly list: GearList
  readonly onPick: (id: string | null) => void
}) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const start = listOf(gear, list)
  const [category, setCategory] = useState(start.category)
  const [query, setQuery] = useState('')
  const key = keyOf(list)
  const owned = {
    skill: gear.skill,
    equipped: gear.blocker,
    pieces: gear.pieces ?? {},
    carried: gear.carried ?? NOTHING_CARRIED,
  }
  // What is held has no « Aucun »: bare hands head its list, unless they are what is held.
  const handsFree = key === 'hand' && start.current !== UNARMED
  const found = keepRows(
    rowsOf(category, owned, language),
    (id, name) =>
      (start.choices === null || start.choices.includes(id)) &&
      !(handsFree && id === UNARMED) &&
      holds(name, query, language),
  )
  const none: NoneRow | null = handsFree
    ? {
        label: blockerOf(UNARMED).name[language],
        note: t.gear.handsFree,
        onPick: () => {
          onPick(UNARMED)
        },
      }
    : start.current === null || key === 'hand' || key === 'moreDrink' || key === 'moreGroup'
      ? null
      : {
          label: t.lists.none[key],
          note:
            key === 'drink' || key === 'group'
              ? effectOf(start.current).name[language]
              : t.lists.noneNote[key],
          onPick: () => {
            onPick(null)
          },
        }
  const select = { kind: 'pick', onPick } as const

  return (
    <div className={styles.list}>
      <SearchField
        query={query}
        label={t.lists.search[key]}
        placeholder={t.lists.search[key]}
        onSearch={setQuery}
        compact={isDesktop}
      />
      {key === 'hand' && (
        <div role="group" aria-label={t.arsenal.category} className={styles.pills}>
          {HAND.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === category}
              className={styles.pill}
              onClick={() => {
                setCategory(option)
              }}
            >
              {t.arsenal.categories[option]}{' '}
              <span className={styles.count}>{formatNumber(categorySize(option), language)}</span>
            </button>
          ))}
        </div>
      )}
      <p className={styles.note}>{noteOf(t, gear, list, language)}</p>
      {isDesktop ? (
        <CategoryTable
          found={found}
          query={query}
          sort="power"
          select={select}
          none={none}
          scrolls
        />
      ) : (
        <Cards found={found} query={query} select={select} none={none} />
      )}
    </div>
  )
}
