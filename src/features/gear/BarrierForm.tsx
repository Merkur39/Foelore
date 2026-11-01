import { useState } from 'react'
import { game } from '@/data'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { NumberField } from '@/ui/NumberField'
import { barrierCapacity, barrierMinutes } from './carried'
import styles from './BarrierForm.module.css'

/** The group's Magic barrier, on a page of Your gear: who it covers, the Blood Magic of its caster, what it
 * then absorbs. Done adds it or keeps the change; « Retirer la barrière » takes off the one Your gear has
 * (`bloodMagic`, undefined while there is none). */
export function BarrierForm({
  bloodMagic,
  onDone,
}: {
  readonly bloodMagic: number | undefined
  readonly onDone: (bloodMagic: number | undefined) => void
}) {
  const t = useT()
  const language = useLanguage()
  const [level, setLevel] = useState(bloodMagic ?? 0)
  const skill = game.barrier.skill[language]

  return (
    <div className={styles.form}>
      <p className={styles.lede}>
        {t.barrier.lede(game.barrier.staff[language], game.barrier.radius, ...barrierMinutes)}
      </p>
      <NumberField
        label={t.barrier.skill(skill)}
        value={level}
        min={0}
        max={100}
        lowerLabel={t.barrier.lower(skill)}
        raiseLabel={t.barrier.raise(skill)}
        onChange={setLevel}
      />
      <div className={styles.absorbs}>
        <span className={styles.label}>{t.barrier.absorbs}</span>
        <span aria-live="polite" className={styles.capacity}>
          {formatNumber(barrierCapacity(level), language)}
        </span>
        <span className={styles.how}>
          {t.barrier.how(game.barrier.absorb, game.barrier.absorbPerSkill, skill)}
        </span>
      </div>
      <div className={styles.actions}>
        {bloodMagic !== undefined && (
          <button
            type="button"
            className={styles.remove}
            onClick={() => {
              onDone(undefined)
            }}
          >
            {t.barrier.remove}
          </button>
        )}
        <button
          type="button"
          className={styles.done}
          onClick={() => {
            onDone(level)
          }}
        >
          {bloodMagic === undefined ? t.barrier.add : t.modal.save}
        </button>
      </div>
    </div>
  )
}
