# Combat data extraction

Read-only tooling that writes `src/data/game.json` from the local Valheim install: creatures (health,
stagger and whether they can play one, weaknesses, weak spots, where they live and at which levels,
attacks with every hit they deal, their timing, AI conditions and summons, what their death deals and
brings), the status effects attacks carry or leave and how burning, spirit and poison deal what a hit leaves over time, blockers for the Arsenal (with how each is obtained and upgraded), the player's block and dodge
values, the world difficulty presets, and the game's own French and English names. It never writes to
the game folder, and the app ships numbers and names only, no game art.

Two sources, both read from the install found through `VALHEIM_INSTALL` (else the default Steam path):

- the assets, with [UnityPy](https://github.com/K0lb3/UnityPy) (`combat_extract/unity.py`, grown from
  Relooking's abandoned `valheim_assets`): a name index of the bundles, asset sets loaded with their
  dependencies, and the class of every component (read from its MonoScript);
- the game code, decompiled by `decompile.cs` (ICSharpCode.Decompiler, needs the .NET SDK) into
  `out/decompile/`: the rules the extraction follows are checked there, against the installed version,
  and the game version is read from it. That is Iron Gate's code: git-ignored, never committed.

The game data and code prevail over any other source, the wiki included.

## Setup

```bash
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
```

## Commands

Run from `tools/extract`. Caches (asset index, decompiled code, dumps, wiki pages) go to `out/`, which
is git-ignored.

```bash
.venv/Scripts/python extract_combat.py   # ~30 s, writes src/data/game.json
.venv/Scripts/python -m unittest discover -s tests -v
.venv/Scripts/python wiki_names.py       # proposes attack names, see below
.venv/Scripts/python dump.py --classes   # how many components of each class the game has
.venv/Scripts/python dump.py Humanoid Aoe SpawnAbility   # full type trees, to look into the data
dotnet run decompile.cs -- assembly_valheim              # done by extract_combat.py when the game changed
```

`dump.py` writes one JSON line per component to `out/dump/<Class>.jsonl`, with its GameObject, the
root of its hierarchy (the prefab, location or dungeon room it belongs to) and every reference
resolved to « cab:pid » and, when known, a name: the place to look before writing an extraction rule.

`extract_combat.py` stops without writing when `curation.json` has a gap (a new creature, a missing
name...): complete the curation, then run it again.

## curation.json

The few choices the game data cannot make, kept by hand; everything else comes from the data:

- `creatures`: the creatures listed, in order. `also` joins variants with the same stats into one
  entry (the dual-wield Krigen, the swamp bat), their attacks and the places they live added up; the
  build fails on a variant whose stats differ. `phases` lists a boss's later phases (Kall's), each
  spawned by the death of the one before and kept with its own stats and attacks. Kall's second phase
  takes no player damage: the aspects its first phase's death brings drain it as they die.
- `ignored`: every other hostile creature met somewhere with attacks, and why (variant, raid copy,
  summon, unnamed...). The build fails on a creature that is neither listed nor ignored.
- `ignoredItems`: item id patterns to leave out of the Arsenal; empty, since items without a source are
  left out by the data already.
- `attacks`: names of the attacks whose item has no localised name in the game (an attack made with a
  player item, the Fallen Warrior's or the Dvergr's, takes the game's name). English names come from the
  [Valheim wiki](https://valheim.fandom.com) when it has them (`from: wiki`), otherwise they are written
  by hand (`hand`), or take a wiki name with a qualifier added by hand (`wiki+hand`); French names are
  translated by hand, except the few the French wiki gives (`+wiki-fr`); `game` marks a name taken from
  the game's own text (a summoned creature's).

`wiki_names.py` matches each attack to the line of the creature's wiki infobox with the same damage,
then by shared words, and writes `out/wiki_names.json`: a proposal to review, never read by the build.

## What the extraction follows

Each module states, in its docstring, the game code it reproduces (decompiled 1.0.21):

- `attacks.py`: the weapons a creature is given and its AI can aim, every hit they deal through
  `Attack.OnAttackTrigger` (melee, area, projectile volleys and bursts), what they spawn (projectiles,
  areas and their ticks, thrown logs, `SpawnAbility` meteors and summons, the Seeker Queen's call, the
  status pools a projectile leaves), explosions and creatures on death (Kall's aspects, an Oozer's blobs),
  true damage, how stars and world scale each hit, and what a running creature tramples; hits are listed
  at their most, timers counted on the game's fixed step;
- `animation.py`: from the animator each creature plays, whether it can be staggered at all, when each
  attack strikes (the clips' speed events included) and when it ends;
- `build.py` keeps an attack as it plays: left out when it never strikes, its bursts capped to the
  attack's length, its chance lowered by random variants that play nothing, its chain dropped when the AI
  cannot keep up;
- `spawns.py`: where each creature is met (open world, alt biomes, locations and dungeons by asset id,
  raids, events, summons, drops, bombs) and at which levels;
- `arsenal.py`: the items that block, their stats and shield modifiers, and how each is obtained and
  upgraded (Forge of Potential included, and its name);
- `rules.py`: the meads, trinkets, sets and gear that change the stagger the player takes, what a block
  or a dodge costs and the parry bonus, and every guardian power, even those that change no hit, with
  their names;
- `build.py` also reads weak spots, tool weaknesses, boss phases, the player, the world presets of the
  Combat slider (damage, star chance, and the start screen's world presets that pick each one under
  another name), status effects and names; it merges identical attacks and reports what the curation
  misses.
