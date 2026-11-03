import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { AppState, Gear } from '@/app/store'
import { useAppState, useUpdate } from '@/app/useAppState'
import { useIsDesktop } from '@/app/useMediaQuery'
import { replaceRoute, useRoute } from '@/app/useRoute'
import type { World } from '@/combat/world'
import { game } from '@/data'
import type { BiomeId } from '@/data/types'
import { bestiaryRoute, placeOf } from '@/features/bestiary/place'
import { GearForm } from '@/features/gear/GearForm'
import { GearListView } from '@/features/gear/GearLists'
import { pickInto, type GearList } from '@/features/gear/lists'
import { useListHeading } from '@/features/gear/useListHeading'
import { WorldForm } from '@/features/world/WorldForm'
import { useLanguage, useT } from '@/i18n/useT'
import { BackIcon } from '@/ui/icons'
import { useReturnScroll } from '@/ui/useReturnScroll'
import styles from './FirstArrival.module.css'

const QUESTIONS = 3

/** The questions of the first arrival, before any creature: where the player fights, then Ton
 * équipement and Ton monde, with their dialogs' own forms, on what is saved (a player of an earlier
 * version finds theirs). Suivant keeps the answer on screen, written as the questions end: the app
 * behind does not move while they are open. The last button adds the world and opens the Bestiary on
 * the biome picked; Passer, like every other way out (Escape), writes the answers kept and leaves the
 * rest as it is. The questions are behind the player either way. A row of Ton équipement opens its list
 * under the question's step, at its top, as in its dialog: picking there, or its back arrow, returns to
 * the question where it was left. */
export function FirstArrival() {
  const t = useT()
  const language = useLanguage()
  const isDesktop = useIsDesktop()
  const saved = useAppState()
  const update = useUpdate()
  const route = useRoute()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [step, setStep] = useState(0)
  const [biome, setBiome] = useState<BiomeId>(() => placeOf(route, saved.biome).biome)
  const [gear, setGear] = useState<Gear>(saved.gear)
  const [world, setWorld] = useState<World>(saved.world)
  const [answers, setAnswers] = useState<Partial<Pick<AppState, 'biome' | 'gear'>>>({})
  const [list, setList] = useState<GearList | null>(null)
  const listHeading = useListHeading()
  const listing = step === 1 && list ? listHeading(gear, list) : null
  const body = useRef<HTMLDivElement>(null)
  const onScroll = useReturnScroll(body, listing !== null)

  useLayoutEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal()
  }, [])

  const close = () => dialog.current?.close()
  const last = step === QUESTIONS - 1
  const biomeName = game.biomes.find((candidate) => candidate.id === biome)?.name[language] ?? ''

  const questions = [
    { title: t.arrival.where, lead: t.arrival.whereLead },
    { title: t.gear.title, lead: t.arrival.gearLead },
    { title: t.world.title, lead: t.arrival.worldLead },
  ] as const
  const { title, lead } = questions[step] ?? questions[0]

  const goOn = () => {
    if (!last) {
      setAnswers({ ...answers, ...(step === 0 ? { biome } : { gear }) })
      setStep(step + 1)
      return
    }
    // The biome and the gear are kept already: Suivant took them on the way here.
    update({ world })
    replaceRoute(bestiaryRoute(biome, null, ''))
    close()
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      className={`${styles.dialog ?? ''} ${listing ? (styles.listing ?? '') : ''}`}
      onClose={() => {
        update({ ...answers, onboarding: true })
      }}
    >
      <header className={styles.header}>
        <div className={styles.top}>
          <span className={styles.step}>{t.arrival.step(step + 1, QUESTIONS)}</span>
          <button type="button" className={styles.skip} onClick={close}>
            {t.arrival.skip}
          </button>
        </div>
        <div aria-hidden="true" className={styles.progress}>
          {Array.from({ length: QUESTIONS }, (_, index) => (
            <span key={index} className={index <= step ? styles.done : undefined} />
          ))}
        </div>
        {listing ? (
          <div className={styles.listHeading}>
            <button
              type="button"
              aria-label={t.lists.back}
              className={styles.listBack}
              onClick={() => {
                setList(null)
              }}
            >
              <BackIcon size={20} />
            </button>
            <span className={styles.listTitles}>
              <span className={styles.kicker}>{t.arrival.listKicker}</span>
              <h2 id={titleId} className={styles.listTitle}>
                {listing.title}
              </h2>
            </span>
            <span className={styles.aside}>{listing.aside}</span>
          </div>
        ) : (
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            <p className={styles.lead}>{lead}</p>
          </div>
        )}
      </header>

      <div ref={body} className={styles.body} onScroll={onScroll}>
        {step === 0 ? (
          <div role="radiogroup" aria-labelledby={titleId} className={styles.biomes}>
            {game.biomes.map((candidate) => (
              <label key={candidate.id} className={styles.biome}>
                <input
                  type="radio"
                  name="biome"
                  value={candidate.id}
                  checked={biome === candidate.id}
                  className={styles.radio}
                  onChange={() => {
                    setBiome(candidate.id)
                  }}
                />
                <span className={styles.biomeName}>{candidate.name[language]}</span>
              </label>
            ))}
          </div>
        ) : step === 1 && list ? (
          <GearListView
            key={JSON.stringify(list)}
            gear={gear}
            list={list}
            onPick={(id) => {
              setGear(pickInto(gear, list, id))
              setList(null)
            }}
          />
        ) : step === 1 ? (
          <GearForm
            gear={gear}
            world={saved.world}
            onChange={(change) => {
              setGear((current) => ({ ...current, ...change }))
            }}
            onOpenList={setList}
          />
        ) : (
          <WorldForm
            world={world}
            onChange={(change) => {
              setWorld((current) => ({ ...current, ...change }))
            }}
          />
        )}
      </div>

      <footer className={styles.footer} hidden={listing !== null}>
        {step > 0 &&
          (isDesktop ? (
            <button
              type="button"
              className={styles.previous}
              onClick={() => {
                setStep(step - 1)
              }}
            >
              {t.arrival.previous}
            </button>
          ) : (
            <button
              type="button"
              aria-label={t.arrival.previousLabel}
              className={styles.back}
              onClick={() => {
                setStep(step - 1)
              }}
            >
              <BackIcon size={20} />
            </button>
          ))}
        <button type="button" className={styles.primary} onClick={goOn}>
          {last ? t.arrival.see(biome, biomeName) : t.arrival.next}
        </button>
      </footer>
    </dialog>
  )
}
