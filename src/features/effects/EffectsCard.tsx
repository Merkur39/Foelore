import { useId, useState } from 'react'
import { useAppState } from '@/app/useAppState'
import type { Hit } from '@/combat/hit'
import { game } from '@/data'
import type { GameCreature } from '@/data/types'
import { barrierMinutes, NOTHING_CARRIED, type CarriedEffect } from '@/features/gear/carried'
import { useWet } from '@/features/weather/wet'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronDownIcon } from '@/ui/icons'
import styles from './EffectsCard.module.css'
import { BARRIER, useLit } from './lit'
import { idleOf, type Against } from './model'
import { useEffectWording } from './wording'

/**
 * « Avec tes effets temporaires », folded: what Your gear carries, then the group's Magic barrier, a switch
 * each, counted at once on the creature's sheet and in the Simulation of its attacks. What changes nothing
 * against `hits` is greyed, without a switch unless it is on, and says why. Nothing when nothing is
 * carried.
 */
export function EffectsCard({
  creature,
  hits,
  stars,
}: {
  readonly creature: GameCreature
  readonly hits: readonly Hit[]
  readonly stars: number
}) {
  const t = useT()
  const language = useLanguage()
  const { gear, world } = useAppState()
  const { carried, on, barrier, toggle } = useLit(creature)
  const wet = useWet().on
  const [open, setOpen] = useState(false)
  const listId = useId()
  if (carried.length === 0 && barrier === null) return null
  const names = [
    ...on.map((effect) => effect.name[language]),
    ...(barrier?.on ? [game.barrier.name[language]] : []),
  ]
  const { group } = gear.carried ?? NOTHING_CARRIED
  const against: Against = { gear, on, hits, world, stars, wet }

  return (
    <div className={styles.card}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        className={styles.head}
        onClick={() => {
          setOpen(!open)
        }}
      >
        <span className={styles.titles}>
          <span className={styles.title}>{t.effects.card}</span>
          <span className={styles.summary}>
            {names.length === 0 ? t.effects.noneOn : t.effects.on(names)}
          </span>
        </span>
        <ChevronDownIcon size={18} className={styles.chevron} />
      </button>
      <div
        id={listId}
        role="group"
        aria-label={t.effects.group}
        hidden={!open}
        className={styles.list}
      >
        {carried.map((effect) => (
          <EffectRow
            key={effect.id}
            effect={effect}
            group={group.includes(effect.id)}
            lit={on.includes(effect)}
            against={against}
            onToggle={() => {
              toggle(effect.id)
            }}
          />
        ))}
        {barrier && (
          <BarrierRow
            capacity={barrier.capacity}
            lit={barrier.on}
            onToggle={() => {
              toggle(BARRIER)
            }}
          />
        )}
        <p className={styles.holds}>{t.effects.holds}</p>
      </div>
    </div>
  )
}

function EffectRow({
  effect,
  group,
  lit,
  against,
  onToggle,
}: {
  readonly effect: CarriedEffect
  /** A power the group casts on you, told apart from yours. */
  readonly group: boolean
  readonly lit: boolean
  readonly against: Against
  readonly onToggle: () => void
}) {
  const language = useLanguage()
  const wording = useEffectWording()
  const id = useId()
  const idle = idleOf(effect, against)
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span
          id={`${id}-name`}
          className={`${styles.name ?? ''} ${idle ? (styles.idle ?? '') : ''}`}
        >
          {effect.name[language]}
        </span>
        <span id={`${id}-tag`} className={styles.tag}>
          {wording.tag(effect, group)}
        </span>
        {idle && (
          <span id={`${id}-note`} className={styles.note}>
            {wording.idle(idle)}
          </span>
        )}
      </div>
      {(idle === null || lit) && (
        <button
          type="button"
          role="switch"
          aria-checked={lit}
          aria-labelledby={`${id}-name`}
          aria-describedby={idle ? `${id}-tag ${id}-note` : `${id}-tag`}
          className={styles.switch}
          onClick={onToggle}
        >
          <span aria-hidden="true" className={styles.track}>
            <span className={styles.knob} />
          </span>
        </button>
      )}
    </div>
  )
}

/** The group's Magic barrier: what it absorbs and how long it lasts, a switch always, since it takes
 * every hit. */
function BarrierRow({
  capacity,
  lit,
  onToggle,
}: {
  readonly capacity: number
  readonly lit: boolean
  readonly onToggle: () => void
}) {
  const t = useT()
  const language = useLanguage()
  const id = useId()
  return (
    <div className={styles.row}>
      <div className={styles.text}>
        <span id={`${id}-name`} className={styles.name}>
          {game.barrier.name[language]}
        </span>
        <span id={`${id}-tag`} className={styles.tag}>
          {t.barrier.tag(capacity, ...barrierMinutes)}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={lit}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-tag`}
        className={styles.switch}
        onClick={onToggle}
      >
        <span aria-hidden="true" className={styles.track}>
          <span className={styles.knob} />
        </span>
      </button>
    </div>
  )
}
