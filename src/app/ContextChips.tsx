import { useId } from 'react'
import { game } from '@/data'
import { useEffectWording } from '@/features/effects/wording'
import { leveled } from '@/features/gear/model'
import { useWet } from '@/features/weather/wet'
import { useLanguage, useT } from '@/i18n/useT'
import { ChevronRightIcon, RainIcon, ShieldIcon, WorldIcon } from '@/ui/icons'
import { blockerOf, enemyScale, gearBlockPower, presetOf } from './context'
import styles from './ContextChips.module.css'
import { RouteLink } from './RouteLink'
import { useAppState } from './useAppState'
import { useRoute } from './useRoute'

/** « Ton équipement » and « Ton monde » at a glance, each opening its dialog, then Wet where the Bestiary's
 * biome rains: in the sidebar on a desktop, in the top bar's context sheet on a phone, where each says which
 * it is. Each says it all to a screen reader in one label; the lines are what the eye reads. */
export function ContextChips({ variant }: { readonly variant: 'sidebar' | 'sheet' }) {
  const t = useT()
  const language = useLanguage()
  const route = useRoute()
  const { gear, world } = useAppState()
  const blocker = blockerOf(gear.blocker)
  const item = blocker.name[language]
  const level = leveled(blocker) ? gear.level : null
  const power = gearBlockPower(gear)
  const difficulty = presetOf(world).name[language]
  const inSheet = variant === 'sheet'
  const iconSize = inSheet ? 22 : 18

  return (
    <div className={inSheet ? styles.sheet : styles.sidebar}>
      <RouteLink
        to={{ ...route, modal: 'gear' }}
        aria-label={t.gear.summary(item, level, power, gear.skill)}
        className={styles.chip}
      >
        <ShieldIcon size={iconSize} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          {inSheet && <span className={styles.label}>{t.gear.title}</span>}
          <span className={styles.name}>{item}</span>
          <span className={styles.meta}>{t.gear.levelAndPower(level, power)}</span>
        </span>
        {inSheet && <ChevronRightIcon size={18} className={styles.go} />}
      </RouteLink>
      <RouteLink
        to={{ ...route, modal: 'world' }}
        aria-label={t.world.summary(difficulty, world.players)}
        className={styles.chip}
      >
        <WorldIcon size={iconSize} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          {inSheet && <span className={styles.label}>{t.world.title}</span>}
          <span className={styles.name}>{difficulty}</span>
          <span className={styles.meta}>
            {t.world.playersAndScale(world.players, enemyScale(world))}
          </span>
        </span>
        {inSheet && <ChevronRightIcon size={18} className={styles.go} />}
      </RouteLink>
      <WetChip inSheet={inSheet} />
    </div>
  )
}

/** Wet, a switch where the Bestiary's biome rains: what it changes, and in the sheet for which biome it
 * counts. The folded sidebar keeps its icon, the whole chip the switch. */
function WetChip({ inSheet }: { readonly inSheet: boolean }) {
  const t = useT()
  const language = useLanguage()
  const wording = useEffectWording()
  const { biome, rains, on, toggle } = useWet()
  const nameId = useId()
  if (!rains) return null
  const name = game.wet.name[language]
  const changes = wording.modifierChanges(game.wet.modifiers)
  const track = (
    <span aria-hidden="true" className={styles.track}>
      <span className={styles.knob} />
    </span>
  )

  if (!inSheet) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={name}
        className={`${styles.chip ?? ''} ${styles.wet ?? ''}`}
        onClick={toggle}
      >
        <RainIcon size={18} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines} aria-hidden="true">
          <span className={styles.name}>{name}</span>
          {changes.map((change) => (
            <span key={change} className={styles.meta}>
              {change}
            </span>
          ))}
        </span>
        <span className={styles.lines}>{track}</span>
      </button>
    )
  }

  const biomeName = game.biomes.find((candidate) => candidate.id === biome)?.name[language] ?? ''
  return (
    <div className={styles.weather}>
      <div className={styles.chip}>
        <RainIcon size={22} strokeWidth={2} className={styles.icon} />
        <span className={styles.lines}>
          <span className={styles.label}>{t.weather.label}</span>
          <span id={nameId} className={styles.name}>
            {name}
          </span>
          <span className={styles.meta}>{changes.join(' · ')}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-labelledby={nameId}
          className={styles.switch}
          onClick={toggle}
        >
          {track}
        </button>
      </div>
      <p className={styles.note}>{t.weather.note(biome, biomeName)}</p>
    </div>
  )
}
