import { useState } from 'react'
import type { Gear } from '@/app/store'
import { useAppState, useUpdate } from '@/app/useAppState'
import type { Equip } from '@/app/routes'
import { closeModal, useRoute } from '@/app/useRoute'
import { game } from '@/data'
import { useLanguage, useT } from '@/i18n/useT'
import { Modal } from '@/ui/Modal'
import { BarrierForm } from './BarrierForm'
import { isCarried, NOTHING_CARRIED, withBarrier } from './carried'
import { GearForm } from './GearForm'
import { GearListView } from './GearLists'
import { pickInto, type GearList } from './lists'
import { useListHeading } from './useListHeading'

/** The row of Your gear an item of the game data goes into, or null for an id it does not know. */
function listFor(gear: Gear, id: string): GearList | null {
  if (game.blockers.some((blocker) => blocker.id === id)) return { kind: 'hand' }
  const piece = game.armorPieces.find((candidate) => candidate.id === id)
  if (piece) return { kind: 'piece', slot: piece.slot }
  const effect = game.ruleEffects.find((candidate) => candidate.id === id)
  if (!effect || !isCarried(effect)) return null
  if (effect.kind !== 'consumable') return { kind: effect.kind }
  // A drink carried already stays where it is.
  return gear.carried?.drinks.includes(id) ? null : { kind: 'drink', index: null }
}

/** The gear the dialog opens on: the saved one, with the item of the address when there is one (the
 * Arsenal's « Équiper » or « Emporter »), as picking it in its row's list would. */
function startingGear(gear: Gear, equip: Equip | undefined): Gear {
  const list = equip ? listFor(gear, equip.item) : null
  return equip && list ? pickInto(gear, list, equip.item) : gear
}

/** « Ton équipement »: what every verdict is worked out with. What you can take follows the draft as it
 * changes; a row opens its list in place of the form, and picking there goes back with it. Valider saves
 * the draft, any other way out leaves the gear as it was. */
export function GearModal() {
  const t = useT()
  const saved = useAppState()
  const update = useUpdate()
  const { equip } = useRoute()
  const [draft, setDraft] = useState<Gear>(() => startingGear(saved.gear, equip))
  const [list, setList] = useState<GearList | null>(null)
  const [barrier, setBarrier] = useState(false)
  const heading = useListHeading()
  const language = useLanguage()
  const carried = draft.carried ?? NOTHING_CARRIED

  if (barrier) {
    return (
      <Modal
        title={game.barrier.name[language]}
        kicker={t.gear.title}
        closeLabel={t.modal.close}
        back={{
          label: t.lists.back,
          onBack: () => {
            setBarrier(false)
          },
        }}
        size="medium"
        onClose={closeModal}
      >
        <BarrierForm
          bloodMagic={carried.barrier}
          onDone={(bloodMagic) => {
            setDraft({ ...draft, carried: withBarrier(carried, bloodMagic) })
            setBarrier(false)
          }}
        />
      </Modal>
    )
  }

  if (list) {
    const { title, aside } = heading(draft, list)
    return (
      <Modal
        title={title}
        kicker={t.gear.title}
        aside={aside}
        closeLabel={t.modal.close}
        back={{
          label: t.lists.back,
          onBack: () => {
            setList(null)
          },
        }}
        size="list"
        onClose={closeModal}
      >
        <GearListView
          key={JSON.stringify(list)}
          gear={draft}
          list={list}
          onPick={(id) => {
            setDraft(pickInto(draft, list, id))
            setList(null)
          }}
        />
      </Modal>
    )
  }

  return (
    <Modal
      title={t.gear.title}
      closeLabel={t.modal.close}
      size="medium"
      footer={{
        cancel: t.modal.cancel,
        save: t.modal.save,
        onSave: () => {
          update({ gear: draft })
        },
      }}
      onClose={closeModal}
    >
      <GearForm
        gear={draft}
        world={saved.world}
        onChange={(change) => {
          setDraft((current) => ({ ...current, ...change }))
        }}
        onOpenList={setList}
        onOpenBarrier={() => {
          setBarrier(true)
        }}
        withGroup
      />
    </Modal>
  )
}
