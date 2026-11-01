import { useId, useState } from 'react'
import type { Route } from '@/app/routes'
import { RouteLink } from '@/app/RouteLink'
import { useAppState } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { replaceRoute } from '@/app/useRoute'
import { NOTHING_CARRIED } from '@/features/gear/carried'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import {
  CATEGORIES,
  categorySize,
  FAMILIES,
  familyOf,
  rowsOf,
  searchArsenal,
  SORTS,
  type ArsenalCategory,
  type ArsenalGear,
  type ArsenalSort,
  type CategoryRows,
} from './model'
import { Cards, CategoryTable, SearchField } from './lists'
import styles from './ArsenalScreen.module.css'

const categoryOfRoute = (route: Route): ArsenalCategory =>
  CATEGORIES.find((category) => category === route.path[0]) ?? 'shields'

const categoryRoute = (route: Route, category: ArsenalCategory): Route => ({
  ...route,
  path: category === 'shields' ? [] : [category],
  query: '',
  modal: null,
})

/**
 * Everything Your gear can hold, wear or carry, compared at level 1 and your skill: by family then
 * category on a phone, categories in a column beside a table on a desktop, or what a search finds in
 * every category. Each opens Your gear with it.
 */
export function ArsenalScreen({ route }: { readonly route: Route }) {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const { gear } = useAppState()
  const category = categoryOfRoute(route)
  const [sort, setSort] = useState<ArsenalSort>('power')
  const owned: ArsenalGear = {
    skill: gear.skill,
    equipped: gear.blocker,
    pieces: gear.pieces ?? {},
    carried: gear.carried ?? NOTHING_CARRIED,
  }
  const sorted = isDesktop ? sort : 'power'
  const searching = route.query.trim() !== ''
  const found = searchArsenal(route.query, language, owned, sorted)
  const shown = rowsOf(category, owned, language, sorted)
  // A row opens Your gear with its item, held, worn or carried, to save there.
  const select = {
    kind: 'open',
    to: (id: string): Route => ({ ...route, modal: 'gear', equip: { item: id } }),
  } as const
  const search = (query: string) => {
    replaceRoute({ ...route, query })
  }
  const nothing = <p className={styles.note}>{t.arsenal.nothingFound(route.query.trim())}</p>

  if (isDesktop) {
    const hits = (option: ArsenalCategory) =>
      found.find((group) => group.category === option)?.rows.length ?? 0
    return (
      <main className={styles.desktop}>
        <nav aria-label={t.arsenal.nav} className={styles.aside}>
          <SearchField
            query={route.query}
            label={t.arsenal.search}
            placeholder={t.arsenal.searchPlaceholderShort}
            onSearch={search}
            compact
          />
          {FAMILIES.map((family) => (
            <div
              key={family.id}
              role="group"
              aria-label={t.arsenal.families[family.id]}
              className={styles.navGroup}
            >
              <span aria-hidden="true" className={styles.navCaption}>
                {t.arsenal.families[family.id]}
              </span>
              {family.categories.map((option) => {
                const count = searching ? hits(option) : categorySize(option)
                return (
                  <RouteLink
                    key={option}
                    to={categoryRoute(route, option)}
                    how="replace"
                    aria-current={!searching && option === category ? 'true' : undefined}
                    className={`${styles.navItem ?? ''} ${searching && count === 0 ? (styles.navNone ?? '') : ''}`}
                  >
                    <span className={styles.navLabel}>{t.arsenal.categories[option]}</span>
                    <span className={styles.navCount}>{formatNumber(count, language)}</span>
                  </RouteLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className={styles.page}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>{t.screens.arsenal}</h1>
            <p className={styles.intro}>
              {searching ? (
                found.length > 0 && (
                  <>
                    {t.arsenal.foundFor(
                      found.reduce((sum, group) => sum + group.rows.length, 0),
                      route.query.trim(),
                      found.length,
                    )}{' '}
                    {t.arsenal.atLevelOne} <Skill skill={gear.skill} />.
                  </>
                )
              ) : (
                <Lede category={category} skill={gear.skill} />
              )}
            </p>
          </div>
          {searching ? (
            found.length > 0 ? (
              <div className={styles.results}>
                {found.map((group) => (
                  <section
                    key={group.category}
                    aria-labelledby={`${group.category}-found`}
                    className={styles.group}
                  >
                    <GroupHead group={group} id={`${group.category}-found`} />
                    <CategoryTable
                      found={group}
                      query={route.query}
                      sort={sorted}
                      select={select}
                    />
                  </section>
                ))}
              </div>
            ) : (
              nothing
            )
          ) : (
            <>
              {shown.kind === 'blocker' && <SortPicker sort={sort} onChange={setSort} />}
              <CategoryTable found={shown} query="" sort={sorted} select={select} scrolls />
            </>
          )}
        </div>
      </main>
    )
  }

  const family = FAMILIES.find(({ id }) => id === familyOf(category)) ?? FAMILIES[0]
  return (
    <main className={styles.phone}>
      <h1 className="visually-hidden">{t.screens.arsenal}</h1>
      <SearchField
        query={route.query}
        label={t.arsenal.search}
        placeholder={t.arsenal.searchPlaceholder}
        onSearch={search}
      />
      {searching ? (
        found.length > 0 ? (
          <>
            <p className={styles.count}>
              {t.arsenal.found(
                found.reduce((sum, group) => sum + group.rows.length, 0),
                found.length,
              )}
            </p>
            <div className={styles.results}>
              {found.map((group) => (
                <section
                  key={group.category}
                  aria-labelledby={`${group.category}-found`}
                  className={styles.group}
                >
                  <GroupHead group={group} id={`${group.category}-found`} />
                  <Cards found={group} query={route.query} select={select} limit={3} />
                  {group.rows.length > 3 && (
                    <RouteLink
                      to={categoryRoute(route, group.category)}
                      how="replace"
                      className={styles.seeAll}
                    >
                      {t.arsenal.seeAll(group.rows.length, t.arsenal.categories[group.category])}
                    </RouteLink>
                  )}
                </section>
              ))}
            </div>
          </>
        ) : (
          nothing
        )
      ) : (
        <>
          <div role="group" aria-label={t.arsenal.family} className={styles.segments}>
            {FAMILIES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={option.id === family.id}
                className={styles.segment}
                onClick={() => {
                  replaceRoute(categoryRoute(route, option.categories[0]))
                }}
              >
                {t.arsenal.familiesShort[option.id]}
              </button>
            ))}
          </div>
          <div role="group" aria-label={t.arsenal.category} className={styles.pills}>
            {family.categories.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={option === category}
                className={styles.pill}
                onClick={() => {
                  replaceRoute(categoryRoute(route, option))
                }}
              >
                {t.arsenal.categories[option]}
              </button>
            ))}
          </div>
          <div className={styles.list}>
            <Cards found={shown} query="" select={select} />
          </div>
        </>
      )}
    </main>
  )
}

function Skill({ skill }: { readonly skill: number }) {
  const language = useLanguage()
  return <span className={styles.skill}>{formatNumber(skill, language)}</span>
}

/** What the figures of a family are worked out with, and what picking a row does. */
function Lede({ category, skill }: { readonly category: ArsenalCategory; readonly skill: number }) {
  const t = useT()
  const family = familyOf(category)
  if (family === 'hand')
    return (
      <>
        {t.arsenal.atLevelOne} <Skill skill={skill} />
        {t.arsenal.pickLevel.hand}
      </>
    )
  if (family === 'armor') return t.arsenal.pickLevel.armor
  return category === 'powers' ? t.arsenal.powersLede : t.arsenal.carryLede
}

/** A category the search found something in: its name and count, then its family. */
function GroupHead({ group, id }: { readonly group: CategoryRows; readonly id: string }) {
  const t = useT()
  return (
    <div className={styles.groupHead}>
      <h2 id={id} className={styles.groupTitle}>
        {t.arsenal.categories[group.category]} · {group.rows.length}
      </h2>
      <span className={styles.groupFamily}>{t.arsenal.families[familyOf(group.category)]}</span>
    </div>
  )
}

function SortPicker({
  sort,
  onChange,
}: {
  readonly sort: ArsenalSort
  readonly onChange: (sort: ArsenalSort) => void
}) {
  const t = useT()
  const id = useId()
  return (
    <div className={styles.toolbar}>
      <label htmlFor={id} className={styles.label}>
        {t.arsenal.sort}
      </label>
      <select
        id={id}
        value={sort}
        className={styles.sort}
        onChange={(event) => {
          onChange(SORTS.find((option) => option === event.target.value) ?? 'power')
        }}
      >
        {SORTS.map((option) => (
          <option key={option} value={option}>
            {t.arsenal.columns[option]}
          </option>
        ))}
      </select>
    </div>
  )
}
