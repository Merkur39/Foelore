import { describe, expect, it, vi } from 'vitest'
import {
  createStore,
  DEFAULT_STATE,
  STORAGE_KEY,
  type AppState,
  type KeyValueStorage,
} from './store'

function memoryStorage(saved?: string): KeyValueStorage {
  const items = new Map<string, string>(saved === undefined ? [] : [[STORAGE_KEY, saved]])
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value)
    },
  }
}

// Site data blocked: reading throws a SecurityError; storage full: writing throws a QuotaExceededError.
const refusingStorage: KeyValueStorage = {
  getItem: () => {
    throw new DOMException('Blocked', 'SecurityError')
  },
  setItem: () => {
    throw new DOMException('Full', 'QuotaExceededError')
  },
}

const changed: AppState = {
  gear: { blocker: 'ShieldBlackmetal', level: 2, skill: 40, armor: 60, maxHealth: 180 },
  world: { difficulty: 'hard', players: 3 },
  theme: 'jour',
  language: 'fr',
  recentAttacks: [{ fighter: 'Troll', attack: 'troll_groundslam' }],
  seenVersion: '1.4.0',
  installOffered: true,
  biome: 'swamp',
  onboarding: true,
}

describe('createStore', () => {
  it('starts on the defaults on a first launch', () => {
    expect(createStore(memoryStorage()).getState()).toEqual(DEFAULT_STATE)
  })

  it('has not offered to install the app yet on a first launch', () => {
    expect(createStore(memoryStorage()).getState().installOffered).toBe(false)
  })

  it('has the questions of the first arrival still to ask on a first launch', () => {
    expect(createStore(memoryStorage()).getState().onboarding).toBe(false)
  })

  it('asks them once of a player of an earlier version, whose settings it keeps', () => {
    const earlier = { gear: changed.gear, world: changed.world, installOffered: true }

    const state = createStore(memoryStorage(JSON.stringify(earlier))).getState()

    expect(state.onboarding).toBe(false)
    expect(state.gear).toEqual(changed.gear)
  })

  it('knows no biome of the player on a first launch', () => {
    expect(createStore(memoryStorage()).getState().biome).toBeNull()
  })

  it('starts with the gear of a new character: bare hands, no skill, no piece, 25 HP', () => {
    expect(createStore(memoryStorage()).getState().gear).toEqual({
      blocker: 'PlayerUnarmed',
      level: 1,
      skill: 0,
      armor: 0,
      maxHealth: 25,
      pieces: {},
      carried: { trinket: null, power: null, drinks: [], group: [] },
    })
  })

  it("keeps the pieces across a reload, and an earlier player's typed armor when they have none", () => {
    const storage = memoryStorage()
    const pieces = { chest: { id: 'ArmorIronChest', level: 2 }, cape: { id: 'CapeWolf', level: 1 } }
    createStore(storage).update({ gear: { ...changed.gear, armor: 0, pieces } })

    expect(createStore(storage).getState().gear.pieces).toEqual(pieces)
    expect(
      createStore(memoryStorage(JSON.stringify({ gear: changed.gear }))).getState().gear,
    ).toEqual(changed.gear)
  })

  it('checks the pieces one by one, never putting the whole gear back for one of them', () => {
    const saved = {
      gear: {
        ...changed.gear,
        armor: 0,
        pieces: {
          helmet: { id: 'HelmetOfAnotherGame', level: 1 },
          chest: { id: 'ArmorIronChest', level: 12 },
          legs: { id: 'CapeWolf', level: 1 },
          cape: { id: 'CapeWolf', level: 0 },
          shoulders: { id: 'CapeWolf', level: 1 },
        },
      },
    }

    expect(createStore(memoryStorage(JSON.stringify(saved))).getState().gear).toEqual({
      ...changed.gear,
      armor: 0,
      pieces: { chest: { id: 'ArmorIronChest', level: 10 }, cape: { id: 'CapeWolf', level: 1 } },
    })
  })

  it('keeps what is carried across a reload', () => {
    const storage = memoryStorage()
    const carried = {
      trinket: 'TrinketIronHealth',
      power: 'GP_Bonemass',
      drinks: ['Potion_frostresist', 'Potion_barleywine'],
      group: ['GP_Fader', 'GP_Moder'],
    }
    createStore(storage).update({ gear: { ...changed.gear, carried } })

    expect(createStore(storage).getState().gear.carried).toEqual(carried)
  })

  it('checks what is carried one by one, each in its own kind, a drink and a power once', () => {
    const saved = {
      gear: {
        ...changed.gear,
        carried: {
          trinket: 'GP_Bonemass',
          power: 'GP_Moder',
          drinks: [
            'Potion_frostresist',
            'MeadOfAnotherGame',
            'Potion_frostresist',
            3,
            'Potion_bzerker',
          ],
          // One's own power is no group's, and a power counts once.
          group: ['GP_Fader', 'GP_Moder', 'Potion_bzerker', 'GP_Fader', 'GP_Queen'],
        },
      },
    }

    expect(createStore(memoryStorage(JSON.stringify(saved))).getState().gear).toEqual({
      ...changed.gear,
      carried: {
        trinket: null,
        power: 'GP_Moder',
        drinks: ['Potion_frostresist', 'Potion_bzerker'],
        group: ['GP_Fader', 'GP_Queen'],
      },
    })
  })

  it("gives players of earlier versions no group's power", () => {
    const saved = {
      gear: { ...changed.gear, carried: { trinket: null, power: 'GP_Bonemass', drinks: [] } },
    }

    expect(createStore(memoryStorage(JSON.stringify(saved))).getState().gear.carried).toEqual({
      trinket: null,
      power: 'GP_Bonemass',
      drinks: [],
      group: [],
    })
  })

  it('carries nothing when what is saved as carried is not a list of effects at all', () => {
    const saved = { gear: { ...changed.gear, carried: { trinket: 7, drinks: 'mead' } } }

    expect(createStore(memoryStorage(JSON.stringify(saved))).getState().gear).toEqual({
      ...changed.gear,
      carried: { trinket: null, power: null, drinks: [], group: [] },
    })
    expect(
      createStore(
        memoryStorage(JSON.stringify({ gear: { ...changed.gear, carried: 'mead' } })),
      ).getState().gear,
    ).toEqual(changed.gear)
  })

  it('keeps the typed armor when the saved pieces are not pieces at all', () => {
    const saved = { gear: { ...changed.gear, pieces: 'iron' } }

    expect(createStore(memoryStorage(JSON.stringify(saved))).getState().gear).toEqual(changed.gear)
  })

  it('starts on the defaults without storage', () => {
    expect(createStore(null).getState()).toEqual(DEFAULT_STATE)
  })

  it('starts on the defaults when the storage cannot be read', () => {
    expect(createStore(refusingStorage).getState()).toEqual(DEFAULT_STATE)
  })

  it('starts on the defaults when the saved state is unreadable', () => {
    expect(createStore(memoryStorage('{"theme": "jour"')).getState()).toEqual(DEFAULT_STATE)
    expect(createStore(memoryStorage('"jour"')).getState()).toEqual(DEFAULT_STATE)
  })

  it('keeps every change across a reload', () => {
    const storage = memoryStorage()
    createStore(storage).update(changed)

    expect(createStore(storage).getState()).toEqual(changed)
  })

  it('keeps the saved settings it can use, and puts back the default of each other one', () => {
    const saved = {
      gear: { ...changed.gear, blocker: 'ShieldOfAnotherGame' },
      world: changed.world,
      theme: 'neon',
      language: 'fr',
      recentAttacks: [{ fighter: 'Troll' }],
      seenVersion: 140,
    }

    expect(createStore(memoryStorage(JSON.stringify(saved))).getState()).toEqual({
      gear: DEFAULT_STATE.gear,
      world: changed.world,
      theme: DEFAULT_STATE.theme,
      language: 'fr',
      recentAttacks: [],
      seenVersion: null,
      installOffered: false,
      biome: null,
      onboarding: false,
    })
  })

  it.each([
    ['a level that is not a number', { gear: { ...changed.gear, level: '2' } }, 'gear'],
    ['a skill out of 0 to 100', { gear: { ...changed.gear, skill: 120 } }, 'gear'],
    ['a level past the forge', { gear: { ...changed.gear, level: 11 } }, 'gear'],
    ['a level the item never reaches', { gear: { ...changed.gear, blocker: 'Lantern' } }, 'gear'],
    [
      'a difficulty the game does not have',
      { world: { difficulty: 'nightmare', players: 1 } },
      'world',
    ],
    ['no player at all', { world: { difficulty: 'hard', players: 0 } }, 'world'],
    ['a language the app does not speak', { language: 'de' }, 'language'],
    ['a version that is no version', { seenVersion: 'latest' }, 'seenVersion'],
    ['an install offer neither made nor not', { installOffered: 'yes' }, 'installOffered'],
    ['a biome the game no longer has', { biome: 'jungle' }, 'biome'],
    ['questions neither asked nor not', { onboarding: 1 }, 'onboarding'],
  ] as const)('puts back the default instead of %s', (_, saved, setting) => {
    const state = createStore(memoryStorage(JSON.stringify(saved))).getState()

    expect(state[setting]).toEqual(DEFAULT_STATE[setting])
  })

  it('tells its subscribers of each change, until they unsubscribe', () => {
    const store = createStore(null)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.update({ theme: 'runes' })
    unsubscribe()
    store.update({ theme: 'brume' })

    expect(listener).toHaveBeenCalledOnce()
  })

  it('keeps a change for the session when the storage refuses it', () => {
    const store = createStore(refusingStorage)

    store.update({ theme: 'jour' })

    expect(store.getState().theme).toBe('jour')
  })
})
