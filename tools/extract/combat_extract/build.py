"""Assembles game.json from the game data (components, animators, spawns, localisation, code) and the
curation, which only chooses the creatures, groups their variants and phases and names the attacks the
game leaves unnamed; it reports what the curation misses or no longer matches.

How an attack plays decides what is kept of it (animation.attack_play):
- nothing plays (no transition waits for its trigger) or no Hit event: it never strikes, and is left out,
  unless it kills its user, which then dies within a second as the AI swaps weapons (Attack.Stop): only
  its death hits are kept;
- a random variant that plays nothing lowers the chance of each hit by its share (Attack.Start);
- several Hit events: "strikes", each one dealing the hits;
- a chain swing only follows if it starts within 0.2 s of the end of the previous one (Attack.Start),
  but MonsterAI waits m_aiAttackInterval from the previous start and m_minAttackInterval from its end:
  a chain whose last swing the AI cannot reach is no chain;
- projectile bursts stop with the attack (Attack.Update stops it once its states are left).
"""
import json
import math
import re

from . import animation, arsenal, components, rules, source, spawns
from . import attacks as attack_data
from .damage import DAMAGE_TYPES, MODIFIERS, TOOL_TYPES, modifiers, pair_modifiers

# Heightmap.Biome names (spawns.BIOMES) and their localisation keys.
BIOME_KEYS = {
    "meadows": "biome_meadows",
    "swamp": "biome_swamp",
    "mountain": "biome_mountain",
    "blackForest": "biome_blackforest",
    "plains": "biome_plains",
    "ashlands": "biome_ashlands",
    "deepNorth": "biome_deepnorth",
    "ocean": "biome_ocean",
    "mistlands": "biome_mistlands",
}
NOT_HOSTILE = {0, 11, 12}  # Character.Faction: Players, PlayerSpawned, TrainingDummy
COMBAT_SLIDER = 1  # WorldModifiers.Combat, the KeySlider of the start screen's « Combat » setting
PRESETS = {"veryeasy": "veryEasy", "easy": "easy", "normal": "normal", "hard": "hard", "veryhard": "veryHard"}
# The WorldPresets enum, as KeyButton.m_preset holds it, and the name WorldPresets.GetDisplayString gives.
WORLD_PRESETS = {"Default": 0, "Custom": 1, "Normal": 2, "Casual": 3, "Easy": 4, "Hard": 5, "Hardcore": 6,
                 "Immersive": 7, "Hammer": 8}
WORLD_PRESET_NAMES = {value: "menu_modifier_" + name.lower() for name, value in WORLD_PRESETS.items()}
WORLD_PRESET_NAMES[WORLD_PRESETS["Default"]] = "menu_default"
CHAIN_WINDOW = 0.2  # Attack.Start: a chain goes on when the next swing starts this soon after the last
CLASSES = sorted(
    set(attack_data.CLASSES) | set(spawns.CLASSES) | set(arsenal.CLASSES) | set(rules.CLASSES)
    | {"Player", "Game", "WeakSpot", "KeySlider", "KeyButton", "SE_Stats", "SE_Burning", "SE_Poison", "MonsterAI",
       "SE_Wet", "SE_Shield", "Aoe"}
)
TAG = re.compile(r"<[^>]+>")
WEAK_SPOT = re.compile(r"^weak_?spot_?", re.I)


class Report:
    def __init__(self):
        self.uncurated = []  # hostile creatures met somewhere, with attacks, neither listed nor ignored
        self.missing = []  # listed creatures, variants, phases or status effects the game does not have
        self.unplaced = []  # listed creatures met nowhere
        self.divergent = []  # variants whose stats differ from the creature they join
        self.unnamed = []  # (creature, attack id) named neither by the game nor by curation.json
        self.unused_names = []  # curation.json attack names no attack needs
        self.unnamed_parts = []  # "creature: part" of weak spots curation.json does not name
        self.unused_parts = []  # curation.json part names no weak spot needs
        self.namesakes = []  # "biome, language: name" a biome lists twice with no origin telling them apart
        self.stale_ignored = []  # ignored names that are no creature prefab of the game


class Names:
    def __init__(self, loc):
        self.loc = loc

    def __call__(self, key):
        key = (key or "").lstrip("$")
        en = TAG.sub("", self.loc.get(key, "English") or "").strip()
        fr = TAG.sub("", self.loc.get(key, "French") or "").strip()
        return {"fr": fr or en, "en": en}  # the game falls back to English as well

    def text(self, value):
        """A text field as Localization.Localize shows it: a $key looked up, any other text as it is."""
        if (value or "").startswith("$"):
            return self(value)
        text = TAG.sub("", value or "").strip()
        return {"fr": text, "en": text}


def _round(value, digits=4):
    value = round(float(value), digits)
    return int(value) if value.is_integer() else value


def _unique(values):
    seen, result = set(), []
    for value in values:
        key = json.dumps(value, sort_keys=True)
        if key not in seen:
            seen.add(key)
            result.append(value)
    return result


def _chain_reach(levels, cooldown, min_interval):
    """How many chain levels the AI plays in a row (see the module notes): none past a level that plays
    nothing; a level whose end is unknown lets the next one come."""
    reach = 0
    for level in levels:
        if level is None:
            break
        reach += 1
        if min_interval > CHAIN_WINDOW or (level["end"] is not None and cooldown > level["end"] + CHAIN_WINDOW):
            break
    return reach


def _cap_bursts(attack, play):
    """Bursts fire every `every` s from the first Hit event on, until the attack ends."""
    if not play or not play["hits"] or play["end"] is None:
        return
    for hit in attack["hits"]:
        bursts = hit.get("bursts")
        if not bursts:
            continue
        fit = math.floor((play["end"] - play["hits"][0]) / bursts["every"] - 1e-6) + 1
        if fit < bursts["count"]:
            for summon in attack.get("summons", []):
                summon["min"] = summon["min"] // bursts["count"] * fit
                summon["max"] = summon["max"] // bursts["count"] * fit
            if fit > 1:
                hit["bursts"] = dict(bursts, count=fit)
            else:
                del hit["bursts"]


def _lowered(attack, share):
    """Each hit and summon of an attack that only plays in `share` of its uses."""
    for one in attack["hits"] + attack.get("summons", []):
        one["chance"] = _round(one.get("chance", 1) * share, 2)


class _Game:
    """What the build reads from one components.collect, by prefab."""

    def __init__(self, index, found, names, curation):
        self.names, self.curation = names, curation
        self.characters = {}  # prefab -> Humanoid or Character row of the prefab root
        for cls in attack_data.CHARACTERS:
            for row in found.rows(cls):
                if row["go_ref"] and row["go_ref"] == row["root_ref"]:
                    self.characters.setdefault(row["go"], dict(row, humanoid=cls == "Humanoid"))
        self.attacks = attack_data.creature_attacks(index, self.characters.values(), found)
        self.animations = animation.creature_animations(index, self.characters.values())
        self.presence = spawns.resolve(index, found)
        self.weak_spots = {"%s:%s" % (row["cab"], row["pid"]): row for row in found.rows("WeakSpot")}
        self.parts_used, self.parts_unnamed = set(), set()
        self.min_attack_interval = {
            row["go"]: row["data"]["m_minAttackInterval"] for row in found.rows("MonsterAI")
            if row["go_ref"] == row["root_ref"]
        }
        self.item_names = {}
        for row in found.rows("ItemDrop"):
            if row["go_ref"] == row["root_ref"]:
                self.item_names.setdefault(row["go"], row["data"]["m_itemData"]["m_shared"]["m_name"])

    def data(self, prefab):
        return self.characters[prefab]["data"]

    # ------------------------------------------------------------------ attacks
    def final_attacks(self, prefab):
        """The creature's attacks that can hit, as they play, before naming and merging."""
        played = self.animations.get(prefab) or {"controller": None, "triggers": {}}
        result = []
        for attack in self.attacks.get(prefab, {}).get("attacks", []):
            attack = json.loads(json.dumps(attack))
            how = attack.pop("animation")
            if not how["name"]:
                continue  # Attack.Start needs an animation
            play = animation.attack_play(played, {
                "m_attackAnimation": how["name"], "m_attackRandomAnimations": how["random"],
                "m_attackChainLevels": how["chain"],
            })
            if play is not None and play["levels"]:
                cooldown = attack.get("ai", {}).get("cooldown", attack_data.AI_DEFAULTS["cooldown"])
                reach = _chain_reach(play["levels"], cooldown, self.min_attack_interval.get(prefab, 0))
                if reach < len(play["levels"]):
                    attack.pop("chain", None)
                best = max(play["levels"][:reach], key=lambda level: len(level["hits"]), default=None)
                play = dict(play, **best) if best else None  # None: its first swing plays nothing
            if play is not None and play["hits"]:
                _cap_bursts(attack, play)
                if play["share"] < 1:
                    _lowered(attack, play["share"])
                if len(play["hits"]) > 1:
                    attack["strikes"] = {"count": len(play["hits"]), "times": [_round(t, 2) for t in play["hits"]]}
            elif play is not None or played["controller"]:
                # Nothing plays or no Hit event: it never strikes. A user it kills still dies (Attack.Stop).
                if not attack.get("killsSelf"):
                    continue
                attack["hits"] = [hit for hit in attack["hits"] if hit.get("onDeath")]
                for strike_only in ("summons", "statusEffect", "leaves"):
                    attack.pop(strike_only, None)
                if not attack["hits"]:
                    continue
            if "summons" in attack:
                attack["summons"] = [self.summon(s) for s in attack["summons"]]
            result.append(attack)
        return result

    def summon(self, summon):
        """The summon with the creature's name, as the game shows it."""
        name = self.names.text(self.data(summon["id"])["m_name"]) if summon["id"] in self.characters else None
        return dict({"id": summon["id"], "name": name}, **summon) if name and name["en"] else summon

    def attack_name(self, attack_id):
        """The name of the game item behind the attack when it has a localised one, else the curated one."""
        key = self.item_names.get(attack_id) or ""
        if key.startswith("$"):
            name = self.names(key)
            if name["en"]:
                return name, "game"
        name = self.curation["attacks"].get(attack_id)
        return ({"fr": name["fr"], "en": name["en"]}, "curation") if name else (None, None)

    def named_attacks(self, creature, prefabs, report, used):
        """Named attacks of a creature and its variants, identical ones merged. What the player takes decides:
        attacks that differ by their chop and pickaxe only are merged, and keep the heavier of each hit's, the
        Magic barrier counting the worst."""
        merged = {}
        for prefab in prefabs:
            for attack in self.final_attacks(prefab):
                name, origin = self.attack_name(attack["id"])
                if origin == "curation":
                    used.add(attack["id"])
                if name is None:
                    report.unnamed.append((creature, attack["id"]))
                    name = {"fr": "", "en": ""}
                found = dict({"ids": [attack["id"]], "name": name}, **{k: v for k, v in attack.items() if k != "id"})
                found["hits"] = [dict(hit) for hit in found["hits"]]  # merging may raise their toolDamage
                felt = dict({k: v for k, v in found.items() if k != "ids"},
                            hits=[{k: v for k, v in hit.items() if k != "toolDamage"} for hit in found["hits"]])
                key = json.dumps(felt, sort_keys=True)
                if key not in merged:
                    merged[key] = found
                    continue
                if attack["id"] not in merged[key]["ids"]:
                    merged[key]["ids"].append(attack["id"])
                for kept, hit in zip(merged[key]["hits"], found["hits"]):
                    tools = max(kept.get("toolDamage", 0), hit.get("toolDamage", 0))
                    if tools:
                        kept["toolDamage"] = tools
        return list(merged.values())

    # ------------------------------------------------------------------ creatures
    def weak_spots_of(self, prefab):
        """Character.m_weakSpots: modifiers a hit on that collider takes instead of the creature's own. A
        WeakSpot under an inactive object never runs Awake, which sets the collider it is found by. The
        game names no body part: the name comes from curation.json."""
        spots = []
        for pptr in self.data(prefab)["m_weakSpots"]:
            row = self.weak_spots.get(pptr.get("_ref"))
            if row is None or not row["active"]:
                continue
            raw = row["data"]["m_damageModifiers"]
            part = WEAK_SPOT.sub("", row["go"]).lower()
            name = self.curation["parts"].get(part)
            if name is None:
                self.parts_unnamed.add("%s: %s" % (prefab, part))
            else:
                self.parts_used.add(part)
            spot = {"part": part, "name": {"fr": name["fr"], "en": name["en"]} if name else {"fr": "", "en": ""},
                    "modifiers": modifiers(raw)}
            tools = modifiers(raw, TOOL_TYPES, left_out=("ignore",))
            if tools:
                spot["toolModifiers"] = tools
            spots.append(spot)
        return spots

    def stats(self, prefab):
        """What fighting the prefab takes, attacks aside."""
        data = self.data(prefab)
        staggerable = bool((self.animations.get(prefab) or {}).get("staggerable"))
        stats = {
            "health": _round(data["m_health"]),
            "staggerFactor": _round(data["m_staggerDamageFactor"]),
            "staggerable": staggerable,
            "staggeredByParry": bool(data["m_staggerWhenBlocked"]) and staggerable,
            "modifiers": modifiers(data["m_damageModifiers"]),
        }
        tools = modifiers(data["m_damageModifiers"], TOOL_TYPES, left_out=("ignore",))
        if tools:
            stats["toolModifiers"] = tools
        spots = self.weak_spots_of(prefab)
        if spots:
            stats["weakSpots"] = spots
        return stats

    def fights(self, creature, prefabs, report, used):
        """attacks, trample, onDeath and deathSummons of a creature and its variants."""
        fight = {"attacks": self.named_attacks(creature, prefabs, report, used)}
        trample = next((self.attacks[p]["trample"] for p in prefabs if "trample" in self.attacks.get(p, {})), None)
        if trample:
            fight["trample"] = trample
        death = _unique(hit for p in prefabs for hit in self.attacks.get(p, {}).get("onDeath", []))
        if death:
            fight["onDeath"] = death
        summons = _unique(self.summon(one) for p in prefabs for one in self.attacks.get(p, {}).get("deathSummons", []))
        if summons:
            fight["deathSummons"] = summons
        return fight

    def phase(self, creature, previous, prefab, report, used):
        """A later phase: the creature its previous phase's death spawns (Character.OnDeath)."""
        effects = self.data(previous)["m_deathEffects"]["m_effectPrefabs"]
        if not any((e["m_prefab"] or {}).get("_ref") == self.characters[prefab]["go_ref"] for e in effects):
            report.missing.append("phase %s, spawned by the death of %s" % (prefab, previous))
        return dict({"id": prefab}, **self.stats(prefab), **self.fights(creature, [prefab], report, used))

    def creature(self, prefab, entry, report, used):
        data = self.data(prefab)
        prefabs = [prefab] + entry.get("also", [])
        main = self.stats(prefab)
        report.divergent += [p for p in entry.get("also", []) if self.stats(p) != main]
        found = [self.presence[p] for p in prefabs if p in self.presence]
        order = self.curation["biomes"]
        native = {b for f in found for b in f["native"]}
        conditional = _unique(c for f in found for c in f["conditional"])
        biomes = native or {b for c in conditional for b in c["biomes"]}

        creature = {"id": prefab, "name": self.names.text(data["m_name"])}
        if "origin" in entry:
            creature["origin"] = entry["origin"]
        creature = dict(creature, boss=bool(data["m_boss"]), **main)
        creature["biomes"] = sorted(biomes, key=lambda b: order.index(b) if b in order else len(order))
        if conditional:
            creature["conditional"] = conditional
        if found:
            creature["stars"] = {"min": min(f["stars"]["min"] for f in found), "max": max(f["stars"]["max"] for f in found)}
        levels = {f["level"] for f in found}
        if len(found) == len(prefabs) and len(levels) == 1 and None not in levels:
            creature["level"] = levels.pop()
        creature.update(self.fights(prefab, prefabs, report, used))
        phases, previous = [], prefab
        for later in entry.get("phases", []):
            phases.append(self.phase(prefab, previous, later, report, used))
            previous = later
        if phases:
            creature["phases"] = phases
        if not biomes:
            report.unplaced.append(prefab)
        return creature

    def uncurated(self):
        listed = set(self.curation["creatures"])
        listed |= {p for e in self.curation["creatures"].values() for p in e.get("also", []) + e.get("phases", [])}
        return sorted(
            prefab for prefab, row in self.characters.items()
            if prefab not in listed and prefab not in self.curation["ignored"] and prefab in self.presence
            and row["data"]["m_faction"] not in NOT_HOSTILE and self.final_attacks(prefab)
        )


# ---------------------------------------------------------------------- player and world
def _player(found):
    data = next(row for row in found.rows("Player") if row["go_ref"] == row["root_ref"])["data"]
    return {
        "modifiers": modifiers(data["m_damageModifiers"]),
        "blockStaminaDrain": _round(data["m_blockStaminaDrain"]),
        "perfectBlockStaminaDrain": _round(data["m_perfectBlockStaminaDrain"]),
        "staggerFactor": _round(data["m_staggerDamageFactor"]),
        "dodgeStamina": _round(data["m_dodgeStaminaUsage"]),
        "perfectDodgeRefund": _round(data["m_perfectDodgeStaminaReturnMultiplier"]),
        "overTime": _over_time(found),
    }


def _freezing(found, names, biomes):
    """Freezing, which Player.UpdateEnvStatusEffects gives in a freezing weather (EnvSetup.m_isFreezing),
    away from fire and shelter, unless the player resists frost: its tick takes m_healthPerTick every
    m_tickInterval s as generic damage, which neither armor nor resistance lowers. `biomes` holds the biome
    ids in the order game.json lists them."""
    se = next(row["data"] for row in found.rows("SE_Stats") if row["data"]["m_Name"] == "Freezing")
    freezes = {setup["m_name"] for row in found.rows("EnvMan") for setup in row["data"]["m_environments"]
               if setup["m_isFreezing"]}
    where = {spawns.BIOMES[bit] for bit, weathers in spawns.weathers(found).items()
             if bit in spawns.BIOMES and weathers & freezes}
    return {
        "name": names(se["m_name"]),
        "damagePerSecond": _round(-se["m_healthPerTick"] / se["m_tickInterval"]),
        "healthRegen": _round(se["m_healthRegenMultiplier"]),
        "biomes": [biome for biome in biomes if biome in where],
    }


def _wet(found, names, biomes):
    """Wet (SE_Wet), which Player.UpdateEnvStatusEffects gives in a wet weather (EnvSetup.m_isWet) away from a
    roof and a shield generator's dome, and Character.UpdateWater in water deep enough: its m_mods merge like
    any effect's, and it lasts m_ttl once the rain stops. `biomes` holds the biome ids in the order game.json
    lists them."""
    se = next(row["data"] for row in found.rows("SE_Wet") if row["data"]["m_Name"] == "Wet")
    wet = {setup["m_name"] for row in found.rows("EnvMan") for setup in row["data"]["m_environments"]
           if setup["m_isWet"]}
    where = {spawns.BIOMES[bit] for bit, weathers in spawns.weathers(found).items()
             if bit in spawns.BIOMES and weathers & wet}
    return {
        "name": names(se["m_name"]),
        "ttl": _round(se["m_ttl"]),
        "modifiers": pair_modifiers(se["m_mods"]),
        "biomes": [biome for biome in biomes if biome in where],
    }


# Skills.SkillType, as its localisation keys name them.
SKILLS = {10: "bloodmagic"}


def _barrier(found, names):
    """The Magic barrier (SE_Shield) a staff casts: its attack's area (an Aoe that takes the attack's
    settings, so the staff's skill) gives it to the caster and every friendly player within its m_radius, and
    SE_Shield.SetLevel makes it absorb m_absorbDamage + m_absorbDamagePerSkillLevel × the caster's skill
    (m_absorbDamageWorldLevel more per world level, a console key Your world does not hold) for
    m_ttlPerItemLevel × the staff's level."""
    shields = {row["data"]["m_Name"]: row["data"] for row in found.rows("SE_Shield")}
    areas = {row["go"]: row["data"] for row in found.rows("Aoe") if row["go_ref"] == row["root_ref"]}
    for _, shared in sorted(arsenal.obtainable(found).items()):
        area = areas.get((shared["m_attack"]["m_attackProjectile"] or {}).get("_name"))
        se = area and shields.get(area["m_statusEffect"])
        if se:
            return {
                "name": names(se["m_name"]),
                "staff": names(shared["m_name"]),
                "skill": names("skill_" + SKILLS[shared["m_skillType"]]),
                "absorb": _round(se["m_absorbDamage"]),
                "absorbPerSkill": _round(se["m_absorbDamagePerSkillLevel"]),
                "ttlPerLevel": se["m_ttlPerItemLevel"],
                "maxLevel": shared["m_maxQuality"],
                "radius": _round(area["m_radius"]),
            }
    raise ValueError("no staff casts a Magic barrier")


def _over_time(found):
    """How the status effects Character.RPC_Damage hands the fire, spirit and poison of a hit to deal it over time:
    Burning and Spirit (SE_Burning) share the dose between m_ttl / m_damageInterval ticks; Poison (SE_Poison)
    lasts m_baseTTL + (dose × m_TTLPerDamagePlayer) ^ m_TTLPower seconds on a player, a tick every
    m_damageInterval s."""
    burning = {row["data"]["m_Name"]: row["data"] for row in found.rows("SE_Burning")}
    poison = next(row["data"] for row in found.rows("SE_Poison") if row["data"]["m_Name"] == "Poison")
    return {
        **{key: {"ttl": _round(burning[name]["m_ttl"]), "interval": _round(burning[name]["m_damageInterval"])}
           for key, name in (("burning", "Burning"), ("spirit", "Spirit"))},
        "poison": {
            "baseTtl": _round(poison["m_baseTTL"]),
            "ttlPerDamage": _round(poison["m_TTLPerDamagePlayer"]),
            "ttlPower": _round(poison["m_TTLPower"]),
            "interval": _round(poison["m_damageInterval"]),
        },
    }


def _world(found, names):
    """Game's per-player scaling and the presets of the start screen's Combat slider, whose keys
    Game.UpdateWorldRates reads as percentages (enemyleveluprate multiplies the chance of a star,
    SpawnSystem.GetLevelUpChance; enemyspeedsize scales a creature's size in Character.Awake and its
    walk and run speed in Character.UpdateWalking, outside interiors only, never its animations). Each also names the world presets of the start screen that pick it
    under another name: a world preset sets its keys (KeyButton.SetKeys), and the slider shows its first
    setting whose keys they all hold, else the one without keys (KeySlider.TryMatch); a world preset
    without any key of the slider leaves the combat alone."""
    game = found.rows("Game")[0]["data"]
    sliders = [row for row in found.rows("KeySlider") if row["data"]["m_modifier"] == COMBAT_SLIDER]
    slider = next((row for row in sliders if row["active"]), sliders[0])["data"]
    settings = slider["m_settings"]

    def keys_of(values):
        return dict(key.lower().split() for key in values)

    def named(keys):  # « enemydamage 150 » -> « enemydamage »; flags have no value
        return {key.split()[0] for key in keys}

    slider_keys = named(key.lower() for setting in settings for key in setting["m_keys"])
    picked = {}  # setting name -> names of the world presets that pick it under another name
    buttons = {row["data"]["m_preset"]: row["data"] for row in found.rows("KeyButton") if row["active"]}
    for preset, button in sorted(buttons.items()):
        keys = {key.lower() for key in button["m_keys"]}
        if preset == WORLD_PRESETS["Default"] or not slider_keys & named(keys):
            continue
        setting = next((s for s in settings if s["m_keys"] and {k.lower() for k in s["m_keys"]} <= keys),
                       next(s for s in settings if not s["m_keys"]))
        name = WORLD_PRESET_NAMES[preset]
        if name != setting["m_name"].lstrip("$"):
            picked.setdefault(setting["m_name"], []).append(names(name))

    presets = []
    for setting in settings:
        keys = keys_of(setting["m_keys"])
        presets.append({
            "id": PRESETS[setting["m_name"].lstrip("$").removeprefix("menu_modifier_")],
            "name": names(setting["m_name"]),
            "enemyDamage": _round(int(keys.get("enemydamage", 100)) / 100),
            "playerDamage": _round(int(keys.get("playerdamage", 100)) / 100),
            "levelUpRate": _round(int(keys.get("enemyleveluprate", 100)) / 100),
            "enemySpeedSize": _round(int(keys.get("enemyspeedsize", 100)) / 100),
            "worldPresets": picked.get(setting["m_name"], []),
        })
    return {
        "damageScalePerPlayer": _round(game["m_damageScalePerPlayer"]),
        "healthScalePerPlayer": _round(game["m_healthScalePerPlayer"]),
        "maxPlayers": game["m_difficultyScaleMaxPlayers"],
        "range": _round(game["m_difficultyScaleRange"]),
        "presets": presets,
    }


def _status_effects(found, creatures, names, report):
    """The status effects the attacks carry or leave (SE_Stats, by asset name)."""
    stats = {row["data"]["m_Name"]: row["data"] for row in found.rows("SE_Stats")}
    attacks = [a for c in creatures for fight in [c] + c.get("phases", []) for a in fight["attacks"]]
    carried = {a["statusEffect"]["id"] for a in attacks if "statusEffect" in a}
    left = {pool["statusEffect"] for a in attacks for pool in a.get("leaves", [])}
    result = {}
    for se_id in sorted(carried | left):
        se = stats.get(se_id)
        if se is None:
            report.missing.append("status effect " + se_id)
            continue
        result[se_id] = {
            "name": names(se["m_name"]),
            "ttl": _round(se["m_ttl"]),
            "speedModifier": _round(se["m_speedModifier"]),
            "modifiers": pair_modifiers(se["m_mods"]),
        }
    return result


def _namesakes(creatures, biomes):
    """Names a biome lists twice, in either language: the game names every skeleton alike, and the app sets
    them apart by their origin, the biome curation.json says they come from."""
    clashes = []
    for biome in biomes:
        for lang in ("fr", "en"):
            seen = [(c["name"][lang], c.get("origin")) for c in creatures if biome in c["biomes"]]
            clashes += sorted({"%s, %s: %s" % (biome, lang, name) for name, origin in seen if seen.count((name, origin)) > 1})
    return clashes


def build(index, curation, workers=8):
    """(game.json data, Report)."""
    report = Report()
    found = components.collect(CLASSES, workers)
    names = Names(source.localization.load(index))
    game = _Game(index, found, names, curation)

    creatures, used = [], set()
    for prefab, entry in curation["creatures"].items():
        absent = [p for p in [prefab] + entry.get("also", []) + entry.get("phases", []) if p not in game.characters]
        report.missing += absent
        if not absent:
            creatures.append(game.creature(prefab, entry, report, used))
    report.uncurated = game.uncurated()
    report.unused_names = sorted(set(curation["attacks"]) - used)
    report.unnamed_parts = sorted(game.parts_unnamed)
    report.namesakes = _namesakes(creatures, curation["biomes"])
    report.unused_parts = sorted(set(curation["parts"]) - game.parts_used)
    report.stale_ignored = sorted(p for p in curation["ignored"] if p not in game.characters)

    data = {
        "game": source.game_version(),
        "world": _world(found, names),
        "player": _player(found),
        "freezing": _freezing(found, names, curation["biomes"]),
        "wet": _wet(found, names, curation["biomes"]),
        "barrier": _barrier(found, names),
        "biomes": [{"id": b, "name": names(BIOME_KEYS[b])} for b in curation["biomes"]],
        "damageTypes": {t: names("inventory_" + t) for t in DAMAGE_TYPES},
        "toolTypes": {t: names("inventory_" + t) for t in TOOL_TYPES},
        "modifiers": {m: names("inventory_" + m.lower()) for m in MODIFIERS if m not in ("normal", "ignore")},
        "statusEffects": _status_effects(found, creatures, names, report),
        "creatures": creatures,
        "blockers": arsenal.blockers(found, names, curation["ignoredItems"]),
        "armorPieces": arsenal.pieces(found, names),
        "forge": arsenal.forge(found, names),
        "ruleEffects": rules.effects(found, names),
    }
    return data, report
