# Foelore — design canvas

The mockups live in a Claude Design artifact: [Foelore — design](https://claude.ai/artifact/DDGhnVebZ9JkXRbWsa2dse)
(artifact type `https://claude.ai/artifact/QKN21svewxgyPb6SYRqWnd`). **The artifact is the source of truth**;
`canvas/project/` is a local working copy of **v211** (canvas.json + every `.dc.html` board).

## Layout of the canvas

- `canvas.json`: pages, boards (position, size, title), notes (row titles), board order, canvas title.
- Page **Origine** (default page, boards without a prefix): mobile boards (390×844) in rows, desktop boards
  (1440×900) in rows below them (`sync_themes.py` lays them out from its `MOBILE` and `DESKTOP` tables). These are the only boards edited by hand.
- Six theme pages, **generated** from Origine: `Braise-`, `Brume-`, `Jour-`, `Runes-`, `Graphite-`, `Parchemin-`
  prefixes. Do not edit them.
- Page **Icône** (`Icone`): the app icon tracks; track A (the brand shield in trait) is the one shipped, as
  `public/icon.svg`. Like every page made by hand, `sync_themes.py` leaves it alone.
- Page **Version** (`Version`): how the app version sits next to the name in Réglages › À propos; track A
  (mono, secondary) is the one shipped, in the Réglages boards. Made by hand as well.
- Page **Compétence** (`Competence`): the Blocking skill field of Ton équipement on a 360 px phone, as it
  overflowed, and two ways to keep its label on one line; track A (the value at the end of the slider) is
  the one carried into the Ton équipement boards, until the owner had the slider replaced by a field with − and +, like
  Niveau and PV max (v164). Made by hand as well.
- Page **Encaisses** (`Encaisses`): the « Ce que tu encaisses » card on a 360 px phone, as it jumped, and two
  steady layouts; track B (the legend under the title, numbers alone on each guard's line) is the one
  carried into the phone Ton équipement board. Made by hand as well.
- The desktop Bestiaire board is a fluid page that carries track B itself: classes and a `max-width: 1399px`
  media query in its helmet, which the search board inherits. Play it narrower than 1400 px to see it.
- Generated from the Bestiaire boards: `Bestiaire-Recherche`, `Desktop-Bestiaire-Recherche`, and `Contexte`
  (« Ton contexte », the phone Bestiaire with its context sheet open). Generated the same way, `Signaler` (Monstre
  with its report sheet open) and `Desktop-Signaler` (the desktop Bestiaire with its report dialog open), a line
  picked; `Merci` and `Desktop-Merci`, the Bestiaire with its thank-you sheet or dialog open; `Plantee` and
  `Desktop-Plantee`, the creature sheet and the desktop Bestiaire with the sheet crashed; `Ligne-Plantee` and
  `Desktop-Ligne-Plantee`, the Troll's row failed (on desktop, its sheet beside it too); `Arsenal-Ligne-Plantee`
  and `Desktop-Arsenal-Ligne-Plantee`, a shield's row failed; `Simulation-Plantee` and
  `Desktop-Simulation-Plantee`, the Simulation crashed. With `Secours`, they make the « Plantages » rows of
  Origine, phone and desktop.
- Réglages boards carry the seven palettes themselves (live preview); their state line must stay
  `this.state = { theme: 'origine', lang: 'auto' };` for the theme copies.
- Page **Origine**, row « Ton équipement » (v196): `Profil` and its lists. Each row of Ton équipement and of the first
  arrival's question 2 names what it holds with a chevron, and opens its list (track A of « Équipement → Arsenal »,
  approved in v195): `Equipement-Tenu` (« Ce que tu tiens », the pills Boucliers, Armes, Autres), `Equipement-Cape`
  (« Ta cape », « Aucune cape » first; it stands for every piece), `Equipement-Bibelot` (« Ton bibelot ») and
  `Equipement-Boisson` (« Une boisson de plus », from « Ajouter une boisson »), each with its `Desktop-` board (the
  dialog widened to the category's table, « Choisir » on each row), and `Arrivee-Casque` / `Desktop-Arrivee-Casque`
  under the question's step. In Play, a row opens its list (the helmet, legs, chest, power and a carried drink have
  no board of their own) and a pick or the back arrow returns. Written once by `scripts/choix/origine.mjs`.
- Ton monde (`Monde`, `Desktop-Monde`, and the first arrival's `Arrivee-Monde`, `Desktop-Arrivee-Monde`), v197: « Ce
  que ça donne » holds the four effects of the Combat setting, the fourth « Taille et vitesse au sol » (the game's
  `enemyspeedsize`), in two columns on a desktop; its note says size and speed hold outside dungeons only, and that
  the pace of attacks never changes.

## Track pages, removed from the canvas (v196, v208, v211)

A version of the canvas holds at most 511 files. Once every track below was carried into Origine, the owner had their
pages removed (2026-10-31; Nouveautés and Dégâts on 2026-11-01, in v208; Pouvoirs in v211): their boards are in this repository's
history (and in the canvas's versions up to v195, v207 and v210), and their generators still write them
(`scripts/arsenal/build.mjs --tracks`, `scripts/equipement-c3/`, `scripts/choix/build.mjs`, which needs the Origine
boards from before `origine.mjs`, `scripts/degats/`, and `scripts/pouvoirs/`, which needs the Origine boards from before
its `origine.mjs`).

- Page **Nouveautés · pistes** (`Nouveautes-*`, v198): What's new, as verbose as it was (`Nouveautes-Auj`, the notes of
  `src/app/releases.ts` at the time), and three tracks on a phone sharing one rewritten copy, a short title and at
  most one sentence of detail per note (`Nouveautes-Textes`, French and English, with each note's kind and track B's
  names): A, patch notes (a NOUVEAU / AMÉLIORÉ / CORRIGÉ tag per line); B, named updates (one card per minor version,
  its name and line, + ↑ ✓ per note, the patches under « Depuis »); C, to try (the screen's icon and a link to it per
  note, « NOUVEAU » and a dot in Réglages until seen). Each track also shows a fix a player reported, as an example.
  Static, written by a scratchpad script from the copy. The owner picked A. Iteration 1 (v199, right of A):
  `Nouveautes-A1`, the phone page with a reported fix on top (1.14.3, an example) and the « Corrigé grâce à toi » sheet,
  whose card keeps the report and its number, then says what changed by the note's title with its tag (never its
  detail); `Nouveautes-A1-Desktop`, the 680 px dialog, the version on the left and the tagged notes on the right.
  Approved by the owner, and carried into Origine and its themes (v200): `Nouveautes` and `Desktop-Nouveautes` (each
  note a kind, a title, an optional detail), and the thank-you sheet of `Bestiaire` and `Desktop-Bestiaire`, whence
  `build_bestiary_search.py` writes `Merci` and `Desktop-Merci`.
- Page **Dégâts · pistes** (`Degats-*`, v202, #64): the damage a hit deals across the game's roll (every hit an attack
  builds times √U(0.75, 1)), and the burning and poison that follow it, on four attacks against an Iron Buckler level 3
  (Blocking 16, armor 48, 140 HP): Moder's Bite (the ticket's case), Moder's Claw (the block breaks 3 times in 4, else
  staggers), the Cultist's Fireclaw (a burn when blocked, none when parried: too little fire passes), Bonemass's Punch
  (poison). `Degats-Auj`, the app as it reads them; track A, ranges on the card, burn and poison on a line of their
  own, how often a verdict comes when the roll changes it; B, « jusqu'à » the top of the roll, burn and poison counted
  in (« dont »), one line under the cards; C, the cards keep the top, « Ce que le jeu tire » folded under them gives
  the ranges, the burn and poison apart, and the verdict's odds. Four phones per track, a desktop each (Bonemass's
  Punch). Static, written by `scripts/degats/` (`data.mts` from the app's engine, `build.mjs`, `add.mjs`). The owner
  picked C, the fold titled « Détails ». Iteration 1 (v203, under the tracks): `Degats-C1`, six phones whose folds open
  and close in Play (the Bite folded, as on arrival; the Claw, the Fireclaw, the Punch; Fader's Flame Breath, a hit with
  its own damage, « Ce coup ne varie pas », one row « LE COUP » since no guard takes it, 0 taken then the whole hit as a
  burn; the free value 90, rolled like an attack's hit, staggering 1 time in 7), and `Degats-C1-Desktop`. Odds read
  « p fois sur q », q up to 10, the simplest within 2.5 points. Iteration 2 (v205, under it), on the owner's word:
  `Degats-C2` and `Degats-C2-Desktop`; while « Détails » is open, each card's own bar is drawn as track A draws it, solid
  to the lowest roll, hatched to the highest, and folded it is today's again; the text under it, and « Détails »,
  stay as in iteration 1. (A first iteration 2, in v204, drew a second bar inside « Détails »: not what the owner
  meant, replaced.) Approved by the owner on 2026-11-01, and carried into Origine and its themes (v206): `Main` and
  `Desktop-Combat` roll their example hit (√U(0.75, 1)), fold « Détails » under the cards (the Troll's 130 blocked
  staggers 1 time in 3) and draw the cards' bars as ranges while it is open; `Simulation-Plantee` and its desktop
  follow from `build_bestiary_search.py`.
- Page **Pouvoirs · pistes** (`Pouvoirs-*`, v207, #79): several forsaken powers at once, as a group shares them (a
  player's own power, given to every player within 10 m when cast), never tied to Your world's player count. The
  mockups' gear (Silver shield level 3, Blocking 25, iron level 1 and the wolf cape level 3, armor 45) against the Lox:
  Bonemass, the player's own, leaves the Bite blocked staggering; Fader's, a friend's, makes every block hold; Moder's,
  another friend's, changes nothing (no frost). `Pouvoirs-Auj`, today: one power, the list swaps it. Track A, powers
  like drinks (« Ajouter un pouvoir », « Un pouvoir de plus », nothing says whose); track B, one's own power apart from
  the group's (a section « Pouvoirs du groupe » in Ton équipement, « Pouvoir du groupe » on the card's rows); track C,
  the group's on the card only (« Du groupe » lists every power but one's own: a switch for those that change a hit
  against the creature, the others named on one line; nothing kept), Ton équipement unchanged. Four phones a track,
  no desktop. Static, written by `scripts/pouvoirs/` (`data.mts` from the app's engine and models, `build.mjs`, which
  takes Ton équipement from `Profil` and shows it scrolled to « Ce que tu emportes », `add.mjs`). The owner picked B.
  Iteration 1 (v208, under the tracks): `Pouvoirs-B1`, five phones: Ton équipement with « Ce que tu emportes » as it
  is and « Pouvoirs du groupe » under it; « Un pouvoir du groupe » (without one's own nor those added); a group power's
  list (swap it, or « Retirer ce pouvoir »); « Ton pouvoir », the group's tagged DU GROUPE (picking one takes it out of
  the group); the Lox's sheet, whose card answers in Play (the Brooch, Bonemass, Fader's: the advice and the verdicts
  follow the engine's eight states, `data.mts` › `states`), the card in Ton équipement's order then the group's,
  « POUVOIR DU GROUPE · 5 MIN ». `Pouvoirs-B1-Desktop`, the Ton équipement dialog from `Desktop-Equipement`, scrolled to
  the two sections. On the owner's feedback (v209): one's own power reads ÉQUIPÉ, not EMPORTÉ (« Ton pouvoir », whose
  « Aucun pouvoir » says « retire le tien », and the Arsenal, whose action reads « Équiper »), and
  `Pouvoirs-B1-Retours` draws the Arsenal's powers on a phone (the generator imports `scripts/arsenal/build.mjs`; one's
  own, then the group's tagged DU GROUPE, at the head) beside three wordings for a row a group's power makes useless,
  on the Fuling shaman with the fire mead and Fader's power on (« un pouvoir du groupe résiste déjà » was not
  understood); `Pouvoirs-B1-Arsenal-Desktop`, the Arsenal's powers on a desktop. The owner picked C (v210), for every
  reason of that kind: « Ne change rien : déjà couvert par ta cape », « … par ton pouvoir », « … par le Pouvoir de
  Fader ». Approved by the owner on
  2026-11-01 (v210), and carried into Origine and its themes (v211) by `scripts/pouvoirs/origine.mjs` (once): `Profil`
  and `Desktop-Equipement` gain « Pouvoirs du groupe » under « Ce que tu emportes » (Fader's power, a friend's, and
  « Ajouter un pouvoir du groupe »); the card « Avec tes effets temporaires » of `Monstre`, `Desktop-Bestiaire`, `Main`
  and `Desktop-Combat` gains it after the drinks, « POUVOIR DU GROUPE · 5 MIN », its stagger ×0,5 at the shield and at
  the armor as the engine has it (the Troll then blocks everything: « Tu bloques tout sans tituber »); `Arsenal` and
  `Desktop-Arsenal` tag one's own power ÉQUIPÉ (« Équiper »), the group's DU GROUPE, both at the head of the powers,
  the desktop's lede for powers reading « Équiper un pouvoir en fait le tien dans Ton équipement ». The first arrival
  keeps no « Pouvoirs du groupe ».
- Page **Simulation · pistes** (`Sim-*`, `SimB-*`): archive of the three Simulation tracks, never regenerated.
- Page **Menu · pistes** (`Menu-A` to `Menu-C`): the three tracks for Ton équipement and Ton monde on a
  phone. The phone boards carry track C's summary button (VD and enemy scale) opening track B's bottom
  sheet, animated; the « Ton contexte » board of Origine shows it open. Made by hand as well.
- Page **Fiche · pistes** (`Fiche`, `Fiche-Desktop`): what the creature sheet showed of the game data and
  now shows too (weak spots, tools, trample, death effects), as 360 px phone fragments in three tracks, then
  track A on the desktop panel for the cases the Troll cannot show; track A (everything in the existing
  sections) is the one chosen, its weak spot carried into the Monstre and Bestiaire desktop boards. Made by
  hand as well, numbers from `src/data/game.json` at the time.
- Page **Squelette · pistes** (`Squelette`): three ways to tell apart two creatures a biome lists under one
  game name (the skeletons): the home biome as a qualifier, the health brought forward, one merged row.
  Track A (« Squelette · Marécages ») is the one chosen: the Bestiaire boards list the meadows skeleton as
  « Squelette · Prairies ». Made by hand as well.
- Page **Étroit · pistes** (`Etroit-*-1024`, `Etroit-*-1280`): the desktop Bestiaire between 1024 and 1400 px,
  where the sheet lacked room for its attack table, as it was and in three tracks, each at 1024 and 1280 px.
  Track B (the sidebar folded to its icons, a 320 px list, the range in the tag line, Simuler as a chevron) is
  the one chosen. Made by hand as well, derived once from the board below and frozen.
- Page **Licence · pistes** (`Licence`): the GPL notice in Réglages › À propos (copyright, free software, no
  warranty, a link to the source), in three tracks: data lines, a sentence, a row. Track C (a 44 px row « Code
  source et licence · GitHub », the short notice under it; a small secondary button on desktop) is the one
  carried into the Réglages boards. Made by hand as well.
- Page **Signaler · pistes** (`Signaler-A` to `Signaler-C`, `Signaler-Desktop`): reporting from the app (#32), in
  three tracks, each with its entry points (creature sheet, Simulation, Réglages › À propos), its report sheet and
  its receipt, online and offline: a link under what one reads, a flag that lets the player tap the wrong line, one
  header button on every screen. Track A (the link) is the one chosen, with the wrong line picked in the sheet as
  optional chips, and drawn on desktop as a 600 px dialog. It is carried into Monstre, Main, Réglages and their
  desktop boards; the sheet itself lives in Monstre and Desktop-Bestiaire. Made by hand as well.
- Page **Retours · pistes** (`Retours-A` to `Retours-C`, `Retours-Desktop`): closing the loop on reports (#33), My
  reports, the « fixed » notice and What's new, in three tracks: all in Settings with a banner, pages of their own
  with a thank-you sheet, a dot without interrupting. Track B is the one chosen: Réglages gains a « Tes retours »
  section whose two rows open `Signalements` and `Nouveautes` (and their desktop boards), and the Bestiaire opens a
  « Corrigé grâce à toi » sheet once after an update that fixed one of the player's reports. Made by hand as well.
- Page **Plantage · pistes** (`Plantage-A` to `Plantage-C`, `Plantage-Desktop`): the crash report (#33), when the
  app fails while drawing, in three tracks on a phone: one page that takes the whole app, the report written on it;
  only the screen that failed, the rest of the app usable and the report in the usual sheet, Bug picked; the app
  restarting by itself, then a banner offering the report. Nothing is sent without the player. Track B is the one
  chosen, drawn on desktop beside it (the card in place of the sheet panel, the 600 px report dialog, the page of
  last resort when the frame of the app fails). Made by hand as well. Carried into Origine: Monstre and
  Desktop-Bestiaire gain a `crashed` state (the card in place of the sheet, Réessayer, « Envoyer le rapport »
  opening their report sheet with Bug picked, an optional « Ce que tu faisais » and the error attached), and
  `Secours` / `Desktop-Secours` are the page of last resort, made by hand, its report in the same sheet.
- Page **Filets · pistes** (`Filets-A` to `Filets-C`): crash nets around the other screens (Simulation, Arsenal,
  Mémo, the Bestiary's list), in three tracks on a phone: a card per screen that names it; nets on each row of a
  list first, a row that fails becoming a short row with « Signaler », then the card of the screen; one card for
  every screen. Track B is the one chosen, drawn on desktop beside it (`Filets-Desktop`: a row of the Bestiary's
  list and of the Arsenal's table, the card of the Simulation). Made by hand as well. Carried into Origine: the
  Bestiaire and Arsenal boards gain a `broken` state (the row of that name fails: the short row with « Signaler »,
  which on the desktop Bestiaire opens its report dialog), Main and Desktop-Combat a `crashed` state (the card of
  the screen).
- Page **Première arrivée · pistes** (`Arrivee-Auj`, `Arrivee-A` to `Arrivee-C`): onboarding, what a first launch
  shows today (a new character's gear, verdicts right in the Meadows and nearly all « dodge » in the Black Forest,
  nothing pointing at « VD 6 ×1 ») and three tracks on a phone: one bottom sheet at the first launch leading to Ton
  équipement and Ton monde; three full-screen questions (the biome, the gear, the world) before the Bestiaire; no
  interruption, a card above the list and a dot on the context button until the gear is set. Track B is the one
  chosen. Made by hand as well, verdicts from the app's model on `src/data/game.json` at the time. Carried into
  Origine in the row « Première arrivée », after the offer to install (whose ways out now lead to it): `Arrivee-Biome`,
  `Arrivee-Equipement`, `Arrivee-Monde` on a phone, `Desktop-Arrivee-*` as a 600 px dialog over the app. The forms of
  questions 2 and 3 are those of the Ton équipement and Ton monde dialogs, shared. « Suivant » keeps the answer, and
  the answers kept are written as the questions end, so the app behind the desktop dialog does not move meanwhile;
  « Passer » (and Escape on a desktop) leaves the questions left, and the one on screen, at what they hold; the last
  button names the biome picked and opens the Bestiaire on it.
- Page **Installer · pistes** (`Installer-A` to `Installer-C`, `Installer-Reglages`): offering to install the app
  (#49), apart from the onboarding and once, in three tracks on a phone (a full screen at the first launch, before the
  onboarding; a bottom sheet as the onboarding ends; a card above the Bestiary's list at the second launch), each on
  Android (a button, where `beforeinstallprompt` fired) and in Safari on an iPhone (the steps; a Home Screen app there
  does not share Safari's storage), then the row of Réglages › À propos that keeps the offer within reach. Made by
  hand as well. Track A is the one chosen, carried into Origine as a row « Première arrivée »: `Installer` (« Installer »
  opens the browser's prompt, drawn), `Installer-Safari` (the steps) and `Desktop-Installer`; `Reglages` gains the row
  under the version, opening the steps' sheet, and `Desktop-Reglages` a small « Installer Foelore » button.
- Page **Mentions · pistes** (`Mentions-A` to `Mentions-C`, `Mentions-Texte`): the notices and credits of Réglages ›
  À propos (fan project, credits for the wiki's attack names, fonts and libraries, the player's data, publisher and
  host), in three tracks on a phone: a page of its own behind one row; everything in À propos, folded; each notice
  where it serves (the data notice in the report sheet, two short notes and a row to a short page). `Mentions-Texte`
  holds the shared copy, French and English. Made by hand as well. Track A is the one chosen, carried into Origine:
  `Mentions` and `Desktop-Mentions` (the page, from Réglages), a « Mentions et crédits » row in `Reglages` between
  Signaler and Code source, and a small button in `Desktop-Reglages`.
- Page **Équipement · pistes** (`Equipement-Auj`, `Equipement-A` to `Equipement-C`, `Equipement-C2`, `Equipement-C3`,
  `Equipement-C3-Avec`, `Equipement-C4`): declaring the armor pieces worn
  (#62) and the temporary effects on (#63), on the owner's fight against Moder (Iron Buckler level 3, Root Harnesk
  among the pieces, numbers from the app's engine on `src/data/game.json`). Today: the typed armor, no resistance,
  the bite parried at 5,8 where the game deals 1,4. Three tracks on a phone: everything in Ton équipement (a section
  for the pieces or the typed armor, one for the effects, checked until unchecked, a reminder at the next launch);
  the pieces in Ton équipement (four cards, a picker per slot, the typed armor kept as a way out) and the effects as
  switches in the context sheet that go off at the end of their time in the game; the pieces only, and no effect
  declared: the creature sheet lists what each effect would change against it, applied to the sheet and the
  Simulation while one reads them. Made by hand as well (drawn from Profil, Contexte, Monstre and Main). Track C
  chosen, with changes: `Equipement-C2`, its first iteration, adds what one carries to Ton équipement (trinket,
  power, drinks), kept out of the verdicts; the creature sheet and the Simulation open « Ce qui t'aiderait » in a
  bottom sheet (what one carries first, then the others, then what makes it worse), and what is applied holds for
  the sheet and the Simulation of its attacks until another creature. `Equipement-C3`, the second, is interactive
  (Play, « Revenir au départ » resets it): seven phones, from Ton équipement and Moder in the Bestiary (« sans tes
  effets temporaires ») to the sheet, « Ce qui t'aiderait » full page (a bulb, not a sparkle), and the Simulation of
  the Bite. With nothing applied, the sheet and the Simulation say it in one short line, « Verdicts sans tes effets
  temporaires », beside the way into « Ce qui t'aiderait » (no card). Each effect shows its name, then its kind and
  duration; what changes nothing is greyed, without a
  switch (the owner had the intro and the sentence under each effect taken out: « trop d'info tue l'info »); one
  trinket at a time; the sections are the creature's (« À double tranchant » for the Berserkir mead); in the
  Simulation, what is greyed follows its stagger bar; phones 4 to 7 share what is applied. Every state (32 switch
  states, 4 bars) is computed by the app's engine and model, by `scripts/equipement-c3/` (from that folder:
  `node --import ./hooks.mjs states.mts`, then `node build_c3.mjs`; `node check_c3.cjs <board>` checks the
  bindings), which also words what each effect changes (`out/states.json`), kept as a spec though the board no
  longer shows it. What is applied, on the sheet and in the Simulation, came in three ways (`Equipement-C3-Avec`,
  static, `build_avec.mjs`): one card, a line of chips, a list; the list (C), a card headed « Avec » with one row
  per effect (kind, duration, a cross to take it off) and « Ce qui t'aiderait » at its head, is the one carried
  into `Equipement-C3`. `Equipement-C4`, the third (interactive, six phones, `build_c4.mjs`, `check_c4.cjs`),
  drops the « Ce qui t'aiderait » screen: on the sheet and in the Simulation, a card « Avec tes effets temporaires »
  unfolds in place and lists what Ton équipement says one carries (trinket, power, drinks), a switch each, counted at
  once until another creature; folded, it names what is on, or « Aucun allumé ». Nothing is on on arrival; what
  changes nothing against the creature is greyed, without a switch, and says so on a third line with its main reason in
  brief (« Ne change rien : ta cape résiste déjà », « … : pas de feu »; `states.mts` gives each muted row a
  `brief`); « Les autres » and « À double tranchant » are gone. In Ton équipement, the drinks join « Ce que tu
  emportes », one row each like the trinket and the power, and « Ajouter une boisson »; a set shows only once complete,
  by its game name, and only the four whose bonus changes a fight (none on phone 1, so « Ensemble : aucun complet » is
  gone; phone 1 bis wears Fenris: « ENSEMBLE COMPLET », Bénédiction de Fenris, « Feu ×0,5 », under the resistances it
  joins). Approved by the owner on 2026-10-30 (v161): `Equipement-C4` is the spec for #62 and #63. Carried into Origine
  (v163): `Profil`, `Desktop-Equipement` and the first arrival's question 2 (`Arrivee-Equipement`,
  `Desktop-Arrivee-Equipement`) take the pieces and « Ce que tu emportes » in place of the typed armor (iron level 1
  and the wolf cape level 3 for armor 45, frost resistant, a Broche en fer, Masse-d'Os and the frost mead carried;
  bronze for armor 28 at the first arrival, nothing carried). `Monstre`, the sheet of `Desktop-Bestiaire`, `Main`
  and `Desktop-Combat` (an attack only: a free value has no type to resist) gain the card « Avec tes effets
  temporaires », the frost mead greyed (« Ne change rien : pas de glace »), what is on counted in their formulas as
  the engine counts it: armor +20, blunt ×0,75 past the shield, Bonemass's block stamina (+5 blocking, +10 for a
  parry that holds). With both on, every parry holds while the ground slam still breaks the block: the sheet's
  advice reads « Pare-le : le blocage cède », the wording of the app's fix for a block that breaks. The Bestiaire boards, and the search boards
  `build_bestiary_search.py` writes, read « SANS TES EFFETS TEMPORAIRES ». In the four forms (v170), the item that
  blocks becomes « MAIN GAUCHE » (« EN MAIN » since v192, the Arsenal's word), one row like a piece (its level on the right; its tag beside the name, dropped in v172), just above
  PIÈCES, with PV MAX and COMPÉTENCE BLOCAGE side by side above it; the torch note and the level note are gone. PIÈCES reads « PIÈCES D'ARMURES » (v171).
- Page **Arsenal · pistes** (`Arsenal-A` to `Arsenal-C`, each with its `-Desktop`): the armor pieces, powers,
  trinkets and drinks in the Arsenal beside what blocks (#67), ten categories under the three families of Ton
  équipement. Track A, two levels (the family, then its categories); track B, one row of all ten that scrolls, by
  family; track C, one line that says where you are and opens the ten (on desktop, a column left of the page).
  The lists are the same in the three: a piece's armor at the level picked and where it stops, what it gains per
  level, its resistances and weaknesses, the set whose bonus changes a fight; an effect's duration, trigger or
  cooldown, and what it changes; equipped or carried first. Generated by `scripts/arsenal/` (from that folder:
  `node --import ../equipement-c3/hooks.mjs data.mts`, then `node build.mjs`; `add.mjs` lays out the page),
  from the game data and the app's rules (v176). The owner picked A on a phone and C on a desktop: iteration 1
  (`Arsenal-AC`, `Arsenal-AC-Desktop-1` to `-4`: shields, chests for a row with both a resistance and a set,
  drinks, a search) names the family of what blocks « En main » (it holds the weapons, which are not held in the
  left hand; « Pour bloquer » first, then the owner's pick among four names) and shows today's shields in the new
  frame, without the speed or the push-back (VD and parry only). No level picker nor skill reminder above the lists:
  every item reads at level 1, its level picked in Ton équipement, which a row opens; on a desktop the page's
  subtitle says so, and what blocks keeps its sort. An effect lists what it changes one change per line. A search
  field, like the Bestiaire's, looks through the ten categories at once (« fer » here): results by category, each
  under its name and family, in its own format; three per category on a phone, then « Voir les 6 armes »; on a
  desktop each category's table, and the column counts the hits. Approved by the owner on 2026-10-31 (v186):
  iteration 1 is the spec for #67; a line of its own starts with a capital (« Bloquer coûte… », the owner's edit in
  the canvas). `node build.mjs` writes the iteration; `--tracks` rewrites the three tracks too.
  Carried into Origine and its themes (v191) by `node build.mjs --origine`: `Arsenal` and `Desktop-Arsenal` are
  rebuilt from the game data and stay interactive (a family or a category picked in Play shows its list; their state
  keeps `broken`, which the « Ligne plantée » boards set); their search fields open the new `Arsenal-Recherche` and
  `Desktop-Arsenal-Recherche`, drawn with « fer » as the Bestiaire's are with « tro », in the « Arsenal et mémo » rows.
  The old Arsenal's hand-typed shields (level stepper, push-back, speed) are gone. In v201, as the app's 1.15.1, the
  powers are the game's seven: Eikthyr's and The Elder's come first, saying « Ne change aucun coup », and the desktop's
  lede for what one carries reads « Lu dans le jeu : les pouvoirs, et les bibelots et boissons qui changent un combat ».
- Page **Équipement → Arsenal · pistes** (`Choix-A` to `Choix-C`, each with its `-Desktop`), v194: three ways for Ton
  équipement's rows (En main, the pieces, what one carries) to lead to the Arsenal's lists (#67), on the mockups' scene
  (the wolf cape N3 swapped for the Ashen Cape, armor 45 → 58, gauges from the app's engine). Track A, the Arsenal's
  list for that row inside Ton équipement (a back arrow, « Aucune cape » first, the dialog widened on a desktop); track
  B, the Arsenal itself in a choosing mode (a banner, « Annuler », « Sans cape » first; the first arrival keeps its
  lists); track C, richer lists in place (a sheet on a phone, unfolded under the row on a desktop, « Comparer dans
  l'Arsenal » at the foot). Generated by `scripts/choix/` (from that folder: `node --import
  ../equipement-c3/hooks.mjs data.mts`, `node build.mjs`, `node add.mjs`), which imports the Arsenal's cards and
  tables from `scripts/arsenal/build.mjs` (it writes nothing when imported).
  The owner picked track A. Iteration 1 (`Choix-A1`, `Choix-A1-Desktop-1` and `-2`, v195): each kind of row's list,
  titled by what it picks (« Ce que tu tiens » with the Arsenal's pills for shields, weapons and the rest, no « Aucun »:
  bare hands are among the rest; « Ton bibelot », « Aucun bibelot » first; « Une boisson de plus » with only the
  drinks not carried yet; a carried drink's « Ta boisson », to swap or « Retirer cette boisson »), and the first
  arrival's question 2 with the list under its step, « Passer » kept. What is picked keeps the level of what it
  replaces, within its own. Approved by the owner on 2026-10-31 (v195): iteration 1 is the spec for the app.

## Workflow

1. Refresh the working copy when the live artifact is newer than v107: read the artifact's file list
   (`Artifact` action `list`, scope `files`) and fetch `project/canvas.json` and every `project/*.dc.html` into
   `canvas/project/`.
2. Edit Origine boards only. Every hex colour must be one of the 16 Origine tokens (see `scripts/palettes.py`),
   otherwise the theme generation stops on an unmapped colour.
3. Rebuild and check, from this folder:

   ```bash
   python scripts/build_bestiary_search.py canvas/project
   python scripts/sync_themes.py canvas/project
   python scripts/check_canvas.py canvas/project
   ```

   - `build_bestiary_search.py`: Bestiaire search screens (mobile + desktop) and the « Ton contexte » board
     from the Bestiaire boards; safe to rerun.
   - `sync_themes.py`: rewrites the six theme copies of every board and lays out `canvas.json` for all pages
     (board positions, row titles). New boards go into its `MOBILE` / `DESKTOP` tables.
   - `check_canvas.py`: missing boards, broken or cross-theme links, Origine colours left in theme boards, and
     every board script run under node (`run_logic.js`).
   - `node scripts/run_logic.js canvas/project/Main.dc.html '{"stars":1}'` prints a board's render values for a
     given state (useful to check verdicts and advice).
4. Before publishing, read the live `project/canvas.json` and compare it with the local one: someone may have
   moved boards or edited in the canvas meanwhile.
5. Publish with the `Artifact` tool: `url` = the artifact, `root` = `design/canvas`, `file_path` =
   `canvas/project/canvas.json`, `files` = the changed boards (`project/<name>.dc.html`, theme copies included).
6. Check the result in Chrome (claude-in-chrome): board « Play » → « Play full screen ».

## Shared definitions

- `scripts/damage_types.py`: the eight damage-type icons (single stroke path on a 24 grid), labels, the
  « STAGGER » flag (blunt, slash, pierce, lightning fill the stagger bar) and the damage-modifier states
  (very weak ×2, weak ×1.5, resistant ×0.5, very resistant ×0.25, immune ×0).
- Labels in the canvas (« coupant », « givre »…) are provisional: the app takes the game's own localisation.
