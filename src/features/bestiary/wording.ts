import { useMemo } from 'react'
import { gearDefence } from '@/app/context'
import { useAppState } from '@/app/useAppState'
import type { AttackVerdicts } from '@/combat/attack'
import type { Verdict } from '@/combat/hit'
import { game } from '@/data'
import type { GameAttack, GameHit, GameRuleEffect } from '@/data/types'
import { useWet } from '@/features/weather/wet'
import type { Language } from '@/i18n/detect'
import type { Catalog } from '@/i18n/fr'
import { formatNumber } from '@/i18n/format'
import { useLanguage, useT } from '@/i18n/useT'
import { dodgeTone, verdictTone, type Tone } from '@/ui/tones'
import { hitTypes, type Assessment } from './model'

export interface Shown {
  readonly tone: Tone
  readonly text: string
}

const ADVICE_TONES = {
  unknown: 'none',
  blockAll: 'ok',
  parryAll: 'warn',
  dodgeAll: 'bad',
  dodgeSome: 'bad',
} as const

/** The advice on a creature, in words and in its verdict colour. */
export function adviceShown(assessment: Assessment, t: Catalog, language: Language): Shown {
  const { advice } = assessment
  const tone = ADVICE_TONES[advice.kind]
  switch (advice.kind) {
    case 'parryAll':
      return { tone, text: t.advice.parryAll(advice.block) }
    case 'dodgeAll':
      return { tone, text: t.advice.dodgeAll(advice.rollsAvoid, assessment.canParry) }
    case 'dodgeSome':
      return {
        tone,
        text: t.advice.dodgeSome(
          advice.rollsAvoid,
          advice.dodge.map((assessed) => assessed.attack.name[language]),
          advice.rest,
        ),
      }
    default:
      return { tone, text: t.advice[advice.kind] }
  }
}

export const blockShown = (verdict: Verdict | null, t: Catalog): Shown => ({
  tone: verdictTone(verdict),
  text: verdict === null ? t.verdicts.nothing : t.verdicts[verdict],
})

export const parryShown = (verdict: Verdict | null, canParry: boolean, t: Catalog): Shown =>
  canParry ? blockShown(verdict, t) : { tone: 'none', text: t.verdicts.cannotParry }

export const dodgeShown = (dodgeable: boolean | null, t: Catalog): Shown => ({
  tone: dodgeTone(dodgeable),
  text:
    dodgeable === null
      ? t.verdicts.nothing
      : dodgeable
        ? t.verdicts.dodgeable
        : t.verdicts.undodgeable,
})

const NONE_ON: readonly GameRuleEffect[] = []

/** The gear and the world every verdict is worked out with, the effects switched on, if any, and Wet when it
 * is on in Your setup. */
export function useFight(on: readonly GameRuleEffect[] = NONE_ON) {
  const { gear, world } = useAppState()
  const wet = useWet().on
  const defence = useMemo(() => gearDefence(gear, on, wet), [gear, on, wet])
  return { defence, world }
}

/** An attack in one sentence, for the label of the row that shows it. */
export function useAttackSummary() {
  const language = useLanguage()
  const summary = useHitsSummary()
  return (attack: GameAttack, damage: number | null, verdicts: AttackVerdicts | null) =>
    summary(attack.name[language], attack.hits, damage, verdicts)
}

/** Named hits in one sentence: an attack, trampling, a death blast. */
export function useHitsSummary() {
  const t = useT()
  const language = useLanguage()
  return (
    name: string,
    hits: readonly GameHit[],
    damage: number | null,
    verdicts: AttackVerdicts | null,
  ) =>
    t.creature.attackSummary({
      name,
      types: hitTypes(hits).map((type) => game.damageTypes[type][language]),
      damage: damage === null ? null : Math.round(damage),
      block: verdicts === null ? '' : blockShown(verdicts.block, t).text,
      parry: verdicts === null ? '' : parryShown(verdicts.parry, verdicts.parry !== null, t).text,
      dodgeable: verdicts?.dodgeable ?? false,
    })
}

export const damageText = (damage: number | null, language: Language) =>
  damage === null ? '—' : formatNumber(Math.round(damage), language)
