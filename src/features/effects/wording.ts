import { DAMAGE_TYPES } from '@/combat/damage'
import { damageMultiplier } from '@/combat/modifiers'
import { game } from '@/data'
import type { GameRuleEffect } from '@/data/types'
import { changesNoHit, effectOf, type CarriedEffect } from '@/features/gear/carried'
import { useLanguage, useT } from '@/i18n/useT'
import type { Idle } from './model'

/** How an effect one carries is told: how long it lasts, what it changes, why it changes nothing. */
export function useEffectWording() {
  const t = useT()
  const language = useLanguage()

  // « 30 s dès 65 d'adrénaline », « 5 min ».
  const lasting = ({ ttl, adrenaline }: GameRuleEffect) => {
    const duration = ttl === undefined ? '' : t.effects.duration(ttl)
    return adrenaline === undefined ? duration : t.effects.fromAdrenaline(duration, adrenaline)
  }

  // Each change on its own, the resistances first, by damage types sharing a multiplier.
  const changes = (effect: GameRuleEffect) => {
    const byMultiplier = new Map<number, string[]>()
    for (const type of DAMAGE_TYPES) {
      const modifier = effect.modifiers?.[type]
      if (modifier === undefined || modifier === 'normal' || modifier === 'ignore') continue
      const multiplier = damageMultiplier(modifier)
      byMultiplier.set(multiplier, [
        ...(byMultiplier.get(multiplier) ?? []),
        game.damageTypes[type][language],
      ])
    }
    if (changesNoHit(effect)) return [t.effects.noHit]
    const flat = effect.blockStaminaFlat ?? 0
    const block = effect.blockStaminaModifier ?? 0
    return [
      ...[...byMultiplier].map(([multiplier, types]) => t.gear.setModifier(types, multiplier)),
      ...(effect.addArmor ? [t.effects.armor(effect.addArmor)] : []),
      ...(effect.armorMultiplier ? [t.effects.armorTimes(1 + effect.armorMultiplier)] : []),
      ...(effect.parryBonus ? [t.effects.parry(1 + effect.parryBonus)] : []),
      ...(effect.staggerModifier ? [t.effects.stagger(1 + effect.staggerModifier)] : []),
      // A guard that costs nothing and gives back: Bonemass's power.
      ...(block === -1 && flat < 0
        ? [t.effects.blockGivesBack(-flat)]
        : block
          ? [t.effects.blockStamina(Math.round(block * 100))]
          : []),
      ...(effect.dodgeStaminaModifier
        ? [t.effects.dodgeStamina(Math.round(effect.dodgeStaminaModifier * 100))]
        : []),
    ]
  }

  return {
    /** How long it lasts: « 30 s dès 65 d'adrénaline », « 5 min ». */
    lasting,
    /** What it changes, each change apart, the resistances first: « armure +20 ». */
    changes,
    /** How long it lasts with its first change, then each other change on a line of its own. */
    lines(effect: GameRuleEffect): readonly string[] {
      const [first, ...rest] = changes(effect)
      const head = lasting(effect)
      return [first === undefined ? head : t.effects.firstLine(head, first), ...rest]
    },
    /** « Bibelot · 30 s dès 65 d'adrénaline », « Pouvoir du groupe · 5 min » for a group's power. */
    tag: (effect: CarriedEffect, group = false) =>
      t.effects.tag(group ? t.effects.groupPower : t.effects.kinds[effect.kind], lasting(effect)),
    idle(idle: Idle): string {
      switch (idle.kind) {
        case 'noHit':
          return t.effects.idleNoHit
        case 'notDealt':
          return t.effects.idle(
            t.effects.notDealt(idle.types.map((type) => game.damageTypes[type][language])),
          )
        case 'resisted':
          return t.effects.idle(
            idle.by.kind === 'group'
              ? t.effects.coveredByPower(effectOf(idle.by.id).name[language])
              : t.effects.coveredBy[idle.by.kind === 'piece' ? idle.by.slot : idle.by.kind],
          )
        default:
          return t.effects.idleHere
      }
    },
  }
}
