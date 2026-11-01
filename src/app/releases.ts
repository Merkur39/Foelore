import type { Localized } from '@/data/types'

/** What a note is about, shown as its tag: something new, something better, something fixed. */
export type NoteKind = 'new' | 'improved' | 'fixed'

/** A line of a version's notes. */
export interface ReleaseNote {
  readonly kind: NoteKind
  /** What the player can do now, or what changed, in ten words at most. */
  readonly title: Localized
  /** One more sentence when it helps, sixteen words at most; only What's new shows it. */
  readonly detail?: Localized
  /** The issues it fixes: a player who reported one of them is thanked for it. */
  readonly fixes?: readonly number[]
  /** The names the players who reported it gave, thanked under it. */
  readonly thanks?: readonly string[]
}

export interface Release {
  readonly version: string
  /** The day it shipped, yyyy-mm-dd. */
  readonly date: string
  readonly notes: readonly ReleaseNote[]
}

/**
 * What's new, newest first: every pull request that bumps the version adds its notes here, and lists
 * under `fixes` the reports it closes (#33). Settings › What's new shows them, and a player whose report
 * one of them fixes is told so after the update.
 */
export const RELEASES: readonly Release[] = [
  {
    version: '1.17.0',
    date: '2026-11-01',
    notes: [
      {
        kind: 'new',
        title: { fr: 'Humide se compte sous la pluie', en: 'Wet counts in the rain' },
        detail: {
          fr: 'Allume-le dans Ton contexte, là où il pleut : il vaut pour tout le biome.',
          en: 'Switch it on in Your setup, where it rains: it holds for the whole biome.',
        },
      },
      {
        kind: 'new',
        title: {
          fr: 'La Barrière magique du groupe compte ses coups',
          en: "The group's Magic barrier counts its hits",
        },
        detail: {
          fr: 'Déclare-la dans Ton équipement : chaque attaque dit combien de coups elle prend.',
          en: 'Declare it in Your gear: each attack says how many hits it takes.',
        },
      },
    ],
  },
  {
    version: '1.16.0',
    date: '2026-11-01',
    notes: [
      {
        kind: 'new',
        title: { fr: "Les pouvoirs du groupe s'ajoutent au tien", en: 'Group powers add to yours' },
        detail: {
          fr: 'Ajoute-les dans Ton équipement, puis allume-les sur la fiche comme le tien.',
          en: 'Add them in Your gear, then switch them on in the sheet like yours.',
        },
      },
      {
        kind: 'improved',
        title: {
          fr: 'Une ligne grisée dit ce qui la couvre déjà',
          en: 'A greyed row says what already covers it',
        },
        detail: {
          fr: "Par exemple « déjà couvert par ta cape », ou par le pouvoir d'un ami.",
          en: "For instance “already covered by your cape”, or by a friend's power.",
        },
      },
    ],
  },
  {
    version: '1.15.3',
    date: '2026-11-01',
    notes: [
      {
        kind: 'fixed',
        title: { fr: 'Les dégâts suivent le jet du jeu', en: "Damage follows the game's roll" },
        detail: {
          fr: 'Détails, sous les cartes, donne chaque coup du jet le plus faible au plus fort.',
          en: 'Details, under the cards, gives each hit from the lowest roll to the highest.',
        },
      },
      {
        kind: 'fixed',
        title: {
          fr: 'Le feu trop faible pour brûler ne compte plus',
          en: 'Fire too weak to burn no longer counts',
        },
        detail: {
          fr: 'Feu et poison se lisent à part dans Détails, avec leur durée.',
          en: 'Fire and poison read apart in Details, with how long they last.',
        },
      },
    ],
  },
  {
    version: '1.15.2',
    date: '2026-10-31',
    notes: [
      {
        kind: 'fixed',
        title: {
          fr: "Changer d'étoiles ne fait plus bouger la fiche",
          en: 'Changing stars no longer moves the sheet',
        },
        detail: {
          fr: 'Comment le prendre garde la place de son conseil le plus long.',
          en: 'How to take it keeps room for its longest advice.',
        },
      },
    ],
  },
  {
    version: '1.15.1',
    date: '2026-10-31',
    notes: [
      {
        kind: 'fixed',
        title: {
          fr: "Les sept pouvoirs sont dans l'Arsenal",
          en: 'All seven powers are in the Arsenal',
        },
        detail: {
          fr: "Eikthyr et L'Aîné s'emportent aussi, sans changer aucun coup.",
          en: 'Eikthyr and The Elder can be carried too; they change no hit.',
        },
      },
    ],
  },
  {
    version: '1.15.0',
    date: '2026-10-31',
    notes: [
      {
        kind: 'improved',
        title: { fr: "Nouveautés se lit d'un coup d'œil", en: "What's new reads at a glance" },
        detail: {
          fr: 'Une étiquette, un titre court, au plus une phrase.',
          en: 'A tag, a short title, one sentence at most.',
        },
      },
    ],
  },
  {
    version: '1.14.2',
    date: '2026-10-31',
    notes: [
      {
        kind: 'improved',
        title: { fr: 'Maintiens + ou − pour aller plus vite', en: 'Hold + or − to go faster' },
        detail: {
          fr: 'PV max, compétence Blocage, niveaux, Valeur libre.',
          en: 'Max HP, Blocking skill, levels, Free value.',
        },
      },
      {
        kind: 'fixed',
        title: {
          fr: 'Cliquer vite ne sélectionne plus le texte voisin',
          en: 'Fast clicks no longer select nearby text',
        },
      },
    ],
  },
  {
    version: '1.14.1',
    date: '2026-10-31',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Ton monde montre la taille et la vitesse des monstres',
          en: "Your world shows the monsters' size and speed",
        },
        detail: {
          fr: "Jusqu'à ×1,2 en Très difficile, hors donjons. Leurs attaques ne vont pas plus vite.",
          en: "Up to ×1.2 on Very Hard, outside dungeons. Their attacks don't speed up.",
        },
      },
    ],
  },
  {
    version: '1.14.0',
    date: '2026-10-31',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Emporte ton bibelot, ton pouvoir et tes boissons',
          en: 'Carry your trinket, power and drinks',
        },
        detail: {
          fr: 'Allume-les sur une fiche ou dans la Simulation : les verdicts suivent.',
          en: 'Switch them on in a sheet or the Simulation: the verdicts follow.',
        },
      },
      {
        kind: 'new',
        title: {
          fr: "L'Arsenal liste aussi armures, capes et effets",
          en: 'The Arsenal also lists armor, capes and effects',
        },
        detail: {
          fr: "Une recherche fouille tout ; une ligne t'en équipe.",
          en: 'One search looks through it all; a row equips you.',
        },
      },
      {
        kind: 'improved',
        title: {
          fr: "Ton équipement se choisit dans les listes de l'Arsenal",
          en: "Your gear is picked from the Arsenal's lists",
        },
        detail: {
          fr: 'Un nouveau joueur commence à mains nues.',
          en: 'A new player starts bare-handed.',
        },
      },
    ],
  },
  {
    version: '1.13.0',
    date: '2026-10-31',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Choisis ton casque, ton plastron, tes jambières et ta cape',
          en: 'Pick your helmet, chest, legs and cape',
        },
        detail: {
          fr: "Armure, résistances et bonus d'ensemble comptent dans chaque verdict.",
          en: 'Armor, resistances and set bonuses count in every verdict.',
        },
      },
      {
        kind: 'improved',
        title: {
          fr: 'Compétence Blocage réglable avec − et +',
          en: 'Blocking skill set with − and +',
        },
      },
      {
        kind: 'new',
        title: {
          fr: 'Le Mémo explique résistances et gel',
          en: 'The Guide explains resistances and freezing',
        },
        detail: {
          fr: "Les résistances ne se multiplient jamais : la plus forte l'emporte.",
          en: 'Resistances never multiply: the strongest wins.',
        },
      },
    ],
  },
  {
    version: '1.12.1',
    date: '2026-10-30',
    notes: [
      {
        kind: 'fixed',
        title: {
          fr: 'Le Bestiaire dit enfin quand le blocage cède',
          en: 'The Bestiary now says when the block gives way',
        },
        detail: {
          fr: 'Comme la Simulation, au lieu de « tu titubes ».',
          en: 'As the Simulation does, instead of “you stagger”.',
        },
      },
    ],
  },
  {
    version: '1.12.0',
    date: '2026-10-28',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Trois questions à la première ouverture',
          en: 'Three questions on first launch',
        },
        detail: {
          fr: 'Ton biome, ton équipement, ton monde : des verdicts justes dès le départ.',
          en: 'Your biome, gear and world: verdicts about you from the start.',
        },
      },
    ],
  },
  {
    version: '1.11.0',
    date: '2026-10-28',
    notes: [
      {
        kind: 'improved',
        title: {
          fr: 'Le Bestiaire rouvre ton dernier biome',
          en: 'The Bestiary reopens your last biome',
        },
      },
    ],
  },
  {
    version: '1.10.0',
    date: '2026-10-28',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Mentions et crédits, dans Réglages',
          en: 'Notices and credits, in Settings',
        },
        detail: {
          fr: 'Projet de fan, sources, tes données.',
          en: 'Fan project, sources, your data.',
        },
      },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-10-28',
    notes: [
      {
        kind: 'new',
        title: { fr: 'Battlewise devient Foelore', en: 'Battlewise is now Foelore' },
        detail: {
          fr: 'Nouvelle adresse, foelore.vercel.app. Tes réglages sont à refaire.',
          en: 'New address, foelore.vercel.app. Your settings need setting again.',
        },
      },
    ],
  },
  {
    version: '1.8.1',
    date: '2026-10-28',
    notes: [
      {
        kind: 'fixed',
        title: {
          fr: 'Chiffres à jour pour Valheim 1.0.21',
          en: 'Numbers updated for Valheim 1.0.21',
        },
        detail: {
          fr: 'Le sol en feu de la Nova contre Kall Mandefimbul : deux fois moins de Feu.',
          en: "The Nova's burning ground against Kall Fimbulbringer: half the Fire.",
        },
      },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-10-28',
    notes: [
      {
        kind: 'new',
        title: {
          fr: "Installe Foelore sur ton écran d'accueil",
          en: 'Install Foelore on your home screen',
        },
        detail: { fr: 'Plein écran, hors ligne.', en: 'Full screen, offline.' },
      },
    ],
  },
  {
    version: '1.7.1',
    date: '2026-10-28',
    notes: [
      {
        kind: 'fixed',
        title: {
          fr: 'Quitter les Réglages ne fait plus clignoter le thème',
          en: 'Leaving Settings no longer flashes the theme',
        },
      },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-10-27',
    notes: [
      {
        kind: 'new',
        title: {
          fr: "Un plantage ne bloque plus toute l'app",
          en: 'A crash no longer takes down the whole app',
        },
        detail: {
          fr: 'Réessaie ou envoie le rapport. Rien ne part sans toi.',
          en: 'Try again or send the report. Nothing leaves without you.',
        },
      },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-10-27',
    notes: [
      {
        kind: 'improved',
        title: {
          fr: 'Un signalement déjà ouvert reçoit un +1',
          en: 'A report already open gets a +1',
        },
      },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-10-27',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Suis tes signalements et les nouveautés',
          en: "Follow your reports and what's new",
        },
        detail: {
          fr: "Dans Réglages. Foelore te prévient quand l'un des tiens est corrigé.",
          en: 'In Settings. Foelore tells you when one of yours is fixed.',
        },
      },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-10-27',
    notes: [
      {
        kind: 'fixed',
        title: {
          fr: 'Fini les créatures hors de leur biome',
          en: 'No more creatures out of their biome',
        },
        detail: {
          fr: "Le Bestiaire suit les apparitions du jeu, et un projectile n'est plus une zone.",
          en: "The Bestiary follows the game's spawns, and a projectile is no longer an area.",
        },
      },
    ],
  },
  {
    version: '1.4.0',
    date: '2026-10-27',
    notes: [
      {
        kind: 'new',
        title: {
          fr: 'Signale une erreur, un bug ou une idée',
          en: 'Report a mistake, a bug or an idea',
        },
        detail: {
          fr: 'Depuis une fiche, la Simulation ou Réglages.',
          en: 'From a sheet, the Simulation or Settings.',
        },
      },
    ],
  },
]

/** Above zero when `a` is the newer version, below when it is the older, zero when they are the same. */
export function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number)
  const right = b.split('.').map(Number)
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}
