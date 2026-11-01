import { createContext, use, useState } from 'react'
import { game } from '@/data'
import type { BiomeId } from '@/data/types'

/** Whether it rains in a biome, so whether one can be wet there (EnvSetup.m_isWet). */
export const rainsIn = (biome: BiomeId) => game.wet.biomes.includes(biome)

/** Wet, as switched on in Your setup for the Bestiary's biome. Kept in memory only: it holds for every
 * creature of that biome until it is switched off or another biome is shown. */
export interface Wet {
  readonly biome: BiomeId
  readonly on: boolean
}

const DRY: Wet = { biome: game.biomes[0]!.id, on: false }

export const WetContext = createContext<{
  readonly wet: Wet
  readonly setWet: (wet: Wet) => void
}>({ wet: DRY, setWet: () => undefined })

/** In the shell, over every screen: Wet follows the biome the Bestiary shows (`shown`, null on the other
 * screens, where the last one stands), and dries off when another is shown. */
export function useWetState(shown: BiomeId | null, start: BiomeId) {
  const [wet, setWet] = useState<Wet>({ biome: shown ?? start, on: false })
  if (shown !== null && shown !== wet.biome) {
    const next = { biome: shown, on: false }
    setWet(next)
    return { wet: next, setWet }
  }
  return { wet, setWet }
}

/** Whether it rains in the Bestiary's biome, whether Wet is on there, and a way to switch it. */
export function useWet() {
  const { wet, setWet } = use(WetContext)
  const rains = rainsIn(wet.biome)
  return {
    biome: wet.biome,
    rains,
    on: rains && wet.on,
    toggle: () => {
      setWet({ biome: wet.biome, on: !wet.on })
    },
  }
}
