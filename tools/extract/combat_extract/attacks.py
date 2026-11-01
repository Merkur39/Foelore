"""A creature's attacks: the weapon items its Humanoid is given (GiveDefaultItems), kept when
ItemData.IsWeapon and aimed at enemies (EquipBestWeapon), followed through every prefab they spawn as
the 1.0.21 code does.

- Attack.OnAttackTrigger: melee and area attacks hit with the item damage x m_damageMultiplier and spawn
  m_spawnOnTrigger; melee also spawns m_shared.m_spawnOnHit once anything is hit (DoMeleeAttack);
  Attack.m_spawnOnHit goes off on a chance per target, and replaces a fired projectile's own. A
  projectile attack fires m_projectiles per burst, m_projectileBursts bursts m_burstInterval apart
  (FireProjectileBurst), each set up with the attack hit. The EffectLists the attack creates are
  instantiated, never set up (EffectList.Create).
- IProjectile.Setup: a Projectile takes the attack hit over its own damage, an Aoe only with
  m_useAttackSettings; both hit with staggerMultiplier 1 (Projectile.OnHit, Aoe.OnHit). Projectile.SpawnOnHit
  passes the hit on only with m_projectilesInheritHitData. SpawnAbility ignores it: it spawns
  Random.Range(min, max) prefabs (max excluded) and only sets up a root Projectile, with the creature as
  owner; the characters it spawns are summons, capped by m_maxSpawned. Other abilities deal no damage.
- Scaling (Attack.ModifyDamage, Character.RPC_Damage): "attack" for a hit the attack built (stars and
  world), "world" for own damage with the creature as owner, "none" without owner (an Aoe spawned by
  SpawnAbility or by an EffectList). Generic damage is "trueDamage" (blocks, armour and resistances
  ignore it). Chop and pickaxe are "toolDamage": no player takes them, but a Magic barrier counts them
  (SE_Shield.OnDamaged adds HitData.GetTotalDamage).
- An Aoe hits the same target every m_hitInterval during m_ttl once active (Aoe.CustomFixedUpdate,
  Aoe.Update). Without triggers "max" is exact. With triggers it hits on contact, then again each time
  Update clears its hit list, the first time at once: "max" is one more than ttl over the interval, an
  upper bound frame timing can lower by one or two. A Projectile with m_hitMidFlight
  hits every m_flightHitInterval while it flies.
- Character.OnDeath creates m_deathEffects ("onDeath", and "deathSummons" for the creatures they bring),
  then CharacterDrop drops what it holds, a creature prefab alive: Random.Range(min, max) of it (max
  excluded), its chance and amount doubled per star with m_levelMultiplier ("doublesPerStar"). An attack
  that kills its user includes the death hits and says so ("killsSelf").
- Timers that run on fixed steps (Time.fixedDeltaTime, the TimeManager's) fire on the step that takes
  them past their interval, in float32: projectile bursts (Attack.UpdateProjectile), Aoe ticks without
  triggers (Aoe.CustomFixedUpdate), mid-flight hits (Projectile.FixedUpdate). Aoe ticks with triggers
  run per frame (Aoe.Update) and keep their interval.
- A projectile's m_hitEffects are created wherever it hits (Projectile.OnHit): an EffectArea among them
  with a status effect is a pool that gives it to the players standing in it, while its TimedDestruction
  lasts ("leaves").
- Projectile.OnHit only spawns m_spawnOnHit where its flags allow: on a character unless
  m_spawnOnCharacters is off, and SpawnOnHit only on the ground with m_groundHitOnly, only on static
  objects with m_staticHitOnly. What cannot spawn on a direct hit comes "afterMiss".
- A spawned ImpactEffect (a thrown log) hits what it runs into with its own damage, times
  LerpStep(m_minVelocity, m_maxVelocity, speed): listed at full speed, with no attacker (HitData defaults:
  neither blockable nor dodgeable) and no scaling.
- MonsterAI only attacks when BaseAI.IsLookingAt holds: an angle below m_aiAttackMaxAngle, inverted by
  m_aiInvertAngleCheck. An attack whose check can never pass is left out.
- TriggerSpawnAbility wakes every TriggerSpawner in range (TriggerAllInRange); the game places them only
  in the Seeker Queen's room, so all placed ones count. Each spawns one of its creatures while fewer than
  m_maxSpawned of it are around (m_maxExtraPerPlayer adds some with more players).
- MovementDamage switches its m_runDamageObject on while the creature runs faster than m_speedTreshold:
  an Aoe it set up as owner, with its own damage ("trample").
- Kind: "melee" for a horizontal or vertical swing; "projectile" when another attack than an area one
  sends a Projectile (fired, or spawned by a SpawnAbility), even one whose own hit is empty and only carries
  what it spawns on impact (fallenvalkyrie_spit); "area" for any other damage; "summon" without damage.

Damage is listed at its maximum. The game multiplies an attack's hit by Character.GetRandomSkillFactor,
sqrt(Random.Range(0.75, 1)) for a creature (0.866 to 1); a melee swing with m_multiHit and
m_lowerDamagePerHit that registers several objects (the ground among them with m_hitTerrain) divides it
by 0.75 times their number. Left out: the fires the cinders of a meteor or a fireball may light
(CinderSpawner, only in the Ashlands or with the Fire world key), the environment rather than the attack.
"""
import math
import struct
from collections import defaultdict

from . import components, source
from .damage import DAMAGE_TYPES, TOOL_TYPES

WEAPON_TYPES = {3, 4, 14, 15, 22}  # ItemData.IsWeapon: one-handed, bow, two-handed, torch, two-handed left
HORIZONTAL, VERTICAL, PROJECTILE, AREA = 0, 1, 2, 4
ENEMY = 0  # ItemData.AiTarget
IPROJECTILES = (
    "Aoe", "Projectile", "SpawnAbility", "TeleportAbility", "TriggerSpawnAbility", "TreeLog", "FishingFloat",
)
CHARACTERS = ("Humanoid", "Character")
OTHERS = ("ImpactEffect", "TriggerSpawner", "MovementDamage", "EffectArea", "TimedDestruction", "CharacterDrop")
CLASSES = ("ItemDrop",) + CHARACTERS + IPROJECTILES + OTHERS  # what creature_attacks needs from components.collect
ITEM_LISTS = ("m_defaultItems", "m_randomWeapon", "m_randomShield", "m_randomArmor")
EFFECTS = ("m_startEffect", "m_triggerEffect", "m_hitEffect", "m_burstEffect")
AI_FIELDS = (  # key, SharedData field, the field's default
    ("range", "m_aiAttackRange", 2),
    ("rangeMin", "m_aiAttackRangeMin", 0),
    ("cooldown", "m_aiAttackInterval", 2),
    ("flying", "m_aiWhenFlying", True),
    ("walking", "m_aiWhenWalking", True),
    ("swimming", "m_aiWhenSwiming", True),
    ("dungeonOnly", "m_aiInDungeonOnly", False),
    ("mistOnly", "m_aiInMistOnly", False),
    ("prioritized", "m_aiPrioritized", False),
)
AI_DEFAULTS = dict({key: default for key, _, default in AI_FIELDS}, health=[0, 1])
MAX_DEPTH = 8
NO_SETUP = {"hit": None, "owner": False}


def _number(value):
    value = round(float(value), 2)
    return int(value) if value.is_integer() else value


def _f32(value):
    return struct.unpack("f", struct.pack("f", value))[0]


def _countdown(interval, step):
    """Seconds between two fires of a timer reset to `interval` and run down by fixed steps to 0."""
    left, steps, dt = _f32(interval), 0, _f32(step)
    while left > 0:
        left, steps = _f32(left - dt), steps + 1
    return _number(steps * step)


def _countup(interval, step):
    """Seconds between two fires of a timer run up by fixed steps until above `interval`."""
    total, steps, dt, limit = 0.0, 0, _f32(step), _f32(interval)
    while total <= limit:
        total, steps = _f32(total + dt), steps + 1
    return _number(steps * step)


def _ref(pptr):
    return pptr.get("_ref") if pptr and pptr.get("m_PathID") else None


def damages(raw, factor=1.0):
    return {t: _number(raw["m_" + t] * factor) for t in DAMAGE_TYPES if raw.get("m_" + t)}


def _hit(raw, factor, blockable, dodgeable, scaling, source, stagger=1):
    hit = {"damages": damages(raw, factor)}
    if raw.get("m_damage"):
        hit["trueDamage"] = _number(raw["m_damage"] * factor)
    tools = sum(raw.get("m_" + t, 0) for t in TOOL_TYPES)
    if tools:
        hit["toolDamage"] = _number(tools * factor)
    hit.update(staggerMultiplier=_number(stagger), blockable=bool(blockable), dodgeable=bool(dodgeable),
               scaling=scaling, source=source)
    return hit


def _deals_damage(hit):
    return bool(hit["damages"] or hit.get("trueDamage"))


class _Prefabs:
    """The collected components, by GameObject."""

    def __init__(self, found):
        self.on = defaultdict(list)  # GameObject ref -> its components
        self.under = defaultdict(list)  # GameObject ref -> (depth, component) of it and its descendants
        self.by_id = {}
        self.trigger_spawners = [  # placed ones: the prefab alone spawns nothing
            row for row in found.rows("TriggerSpawner") if row["go_ref"] != row["root_ref"] and row["active"]
        ]
        for cls in CLASSES:
            for row in found.rows(cls):
                self.on[row["go_ref"]].append(row)
                for depth, go in enumerate(row["chain"]):
                    self.under[go].append((depth, row))
                self.by_id[(row["cab"], row["pid"])] = row

    def live(self, go):
        """Components that run once the prefab is instantiated, the root's first."""
        rows = sorted(self.under.get(go, []), key=lambda found: found[0])
        return [row for _, row in rows if row["active"] and row["data"].get("m_Enabled", 1)]

    def first(self, go, classes):
        return next((row for row in self.on.get(go, []) if row["class"] in classes), None)

    def name(self, go):
        rows = self.on.get(go)
        return rows[0]["go"] if rows else go


# ---------------------------------------------------------------------- counts
def _merge(founds):
    hits, summons = [], []
    for found_hits, found_summons in founds:
        hits += found_hits
        summons += found_summons
    return hits, summons


def _times(found, most, least=None):
    """Hits and summons of `most` instances, `least` at least."""
    hits, summons = found
    least = most if least is None else least
    for hit in hits:
        count = hit.pop("count", 1)
        low = hit.pop("countMin", count) * least
        count *= most
        if count != 1:
            hit["count"] = count
        if low != count:
            hit["countMin"] = low
    for summon in summons:
        summon["min"] *= least
        summon["max"] *= most
    return hits, summons


def _on_chance(found, chance):
    hits, summons = found
    if chance < 1:
        for one in hits + summons:
            one["chance"] = _number(one.get("chance", 1) * chance)
        for summon in summons:
            summon["min"] = 0
    return hits, summons


def _fired(game, found, attack):
    """One projectile instance fired m_projectiles times per burst (FireProjectileBurst), in
    m_projectileBursts bursts (Attack.UpdateProjectile): hits count one burst, summons all of them."""
    hits, summons = _times(found, attack["m_projectiles"])
    bursts = attack["m_projectileBursts"]
    if bursts > 1:
        for hit in hits:
            hit["bursts"] = {"count": bursts, "every": _countdown(attack["m_burstInterval"], game.step)}
        for summon in summons:
            summon["min"] *= bursts
            summon["max"] *= bursts
    return hits, summons


# ---------------------------------------------------------------------- spawned prefabs
def _spawn(game, go, mode, setup, depth=0):
    """(hits, summons) of one instance of a prefab: the IProjectile the spawner finds (`mode`) is set up
    with `setup`, the other components run on their own."""
    if go is None or depth > MAX_DEPTH or game.first(go, CHARACTERS):
        return [], []  # a spawned character deals damage through its own attacks
    rows = game.live(go)
    chosen = _set_up(rows, go, mode)
    return _merge(_component(game, row, setup if row is chosen else None, depth) for row in rows)


def _set_up(rows, go, mode):
    """The component a spawner sets up: GetComponent<IProjectile> ("root"), GetComponentInChildren
    ("children"), SpawnAbility's GetComponent<Projectile> ("projectile"), none for an EffectList (None)."""
    if mode == "children":
        return next((row for row in rows if row["class"] in IPROJECTILES), None)
    classes = IPROJECTILES if mode == "root" else ("Projectile",) if mode == "projectile" else ()
    return next((row for row in rows if row["go_ref"] == go and row["class"] in classes), None)


def _component(game, row, setup, depth):
    """What one component deals; `setup` is None when nobody set it up (own damage, no owner)."""
    if row["class"] == "Aoe":
        return _aoe(game, row["data"], setup or NO_SETUP), []
    if row["class"] == "Projectile":
        return _projectile(game, row["data"], setup or NO_SETUP, depth)
    if row["class"] == "SpawnAbility" and setup:
        return _spawn_ability(game, row["data"], setup, depth)
    if row["class"] == "TriggerSpawnAbility" and setup:
        return [], _trigger_spawns(game)
    if row["class"] == "ImpactEffect":
        return _impact(row["data"]), []
    return [], []  # Teleport and TriggerSpawn abilities move or wake things up, an idle ability does nothing


def _own_scaling(setup):
    return "world" if setup["owner"] else "none"


def _aoe(game, aoe, setup):
    if not aoe["m_hitCharacters"] or (setup["owner"] and not aoe["m_hitEnemy"]):
        return []  # Aoe.ShouldHit: the hitEnemy filter only applies with an owner
    if setup["hit"] is not None and aoe["m_useAttackSettings"]:
        hit = dict(setup["hit"], staggerMultiplier=1, source="aoe")
    else:
        hit = _hit(aoe["m_damage"], 1, aoe["m_blockable"], aoe["m_dodgeable"], _own_scaling(setup), "aoe")
    if not aoe["m_useTriggers"] and not _ref(aoe["m_useCollider"]):
        hit["radius"] = _number(aoe["m_radius"])
    ticks = _ticks(game, aoe)
    if ticks:
        hit["ticks"] = ticks
    return [hit]


def _ticks(game, aoe):
    """{every, max, delay} of an Aoe that hits the same target again, None for a single hit."""
    if aoe["m_hitInterval"] <= 0:
        return None
    every = aoe["m_hitInterval"] if aoe["m_useTriggers"] else _countdown(aoe["m_hitInterval"], game.step)
    ticks = {"every": _number(every)}
    ttl = max(aoe["m_ttl"], aoe["m_ttlMax"])  # the ttl counts down once the activation delay is over
    if ttl > 0:
        ticks["max"] = math.ceil(ttl / every - 1e-6) + (1 if aoe["m_useTriggers"] else 0) + (1 if aoe["m_hitAfterTtl"] else 0)
        if ticks["max"] <= 1:
            return None
    if aoe["m_activationDelay"] > 0:
        ticks["delay"] = _number(aoe["m_activationDelay"])
    return ticks


def _impact(effect):
    """ImpactEffect.OnCollisionEnter: its own damage at full speed, no attacker."""
    if not effect["m_damagePlayers"]:
        return []
    hit = _hit(effect["m_damages"], 1, False, False, "none", "impact")
    return [hit] if _deals_damage(hit) else []


def _trigger_spawns(game):
    caps = {}
    for row in game.trigger_spawners:
        for go in (_ref(p) for p in row["data"]["m_creaturePrefabs"]):
            if go:
                caps[go] = max(caps.get(go, 0), row["data"]["m_maxSpawned"])
    return [{"id": game.name(go), "min": 0, "max": cap, "cap": 0} for go, cap in caps.items()]


def _after_miss(found):
    hits, summons = found
    for one in hits + summons:
        one["afterMiss"] = True
    return hits, summons


def _projectile(game, projectile, setup, depth):
    hit, owner = setup["hit"], setup["owner"]
    if hit is not None:
        own = dict(hit, staggerMultiplier=1, source="projectile")
    else:
        own = _hit(projectile["m_damage"], 1, projectile["m_blockable"], projectile["m_dodgeable"],
                   _own_scaling(setup), "projectile")
    if projectile["m_aoe"] > 0:
        own["radius"] = _number(projectile["m_aoe"])
        if projectile["m_hitMidFlight"]:
            own["ticks"] = {"every": _countup(projectile["m_flightHitInterval"], game.step)}
    only_spawns = _ref(projectile["m_spawnOnHit"]) and projectile["m_onlySpawnedProjectilesDealDamage"]
    found = [([] if only_spawns else [own], [])]

    # Projectile.SpawnOnHit, unless the attack replaced the prefab (FireProjectileBurst)
    prefab, chance = setup.get("spawnOnHit") or (_ref(projectile["m_spawnOnHit"]), projectile["m_spawnOnHitChance"])
    if prefab:
        inherited = hit if projectile["m_projectilesInheritHitData"] else None
        if inherited is not None and projectile["m_divideDamageBetweenProjectiles"]:
            # the game divides the shared hit again for every spawn: the first one gets this, the next ones less
            share = 1 / projectile["m_spawnCount"]
            inherited = dict(inherited, damages={t: _number(v * share) for t, v in inherited["damages"].items()})
            if "toolDamage" in inherited:
                inherited["toolDamage"] = _number(inherited["toolDamage"] * share)
        spawned = _spawn(game, prefab, "children", {"hit": inherited, "owner": owner}, depth + 1)
        spawned = _on_chance(_times(spawned, projectile["m_spawnCount"]), chance)
        on_you = projectile["m_spawnOnCharacters"] and not (projectile["m_groundHitOnly"] or projectile["m_staticHitOnly"])
        found.append(spawned if on_you else _after_miss(spawned))

    randoms = [_ref(p) for p in projectile["m_randomSpawnOnHit"] if _ref(p)]
    picks = 1 if projectile["m_oneOfEachRandomSpawn"] else projectile["m_randomSpawnOnHitCount"]
    sure = projectile["m_oneOfEachRandomSpawn"] or len(randoms) == 1
    for go in randoms:
        spawned = _spawn(game, go, "root", {"hit": None, "owner": owner}, depth + 1)
        found.append(_times(spawned, picks, picks if sure else 0))
    return _merge(found)


def _spawn_ability(game, ability, setup, depth):
    least, most = ability["m_minToSpawn"], ability["m_maxToSpawn"]
    most = most - 1 if most > least else least  # Random.Range(int, int) excludes its maximum
    prefabs = list(dict.fromkeys(_ref(p) for p in ability["m_spawnPrefab"] if _ref(p)))
    if len(prefabs) > 1:
        least = 0  # every spawn picks one of them
    found = []
    for go in prefabs:
        if game.first(go, CHARACTERS):
            found.append(([], [{"id": game.name(go), "min": least, "max": most, "cap": ability["m_maxSpawned"]}]))
        else:
            spawned = _spawn(game, go, "projectile", {"hit": None, "owner": setup["owner"]}, depth + 1)
            found.append(_times(spawned, most, least))
    return _merge(found)


def _effects(game, effect_list):
    """(hits, summons) of what an EffectList creates; nothing sets it up (EffectList.Create)."""
    return _merge(_spawn(game, _ref(entry["m_prefab"]), None, NO_SETUP)
                  for entry in effect_list["m_effectPrefabs"] if entry["m_enabled"])


def _pools(game, effect_list):
    """Status effects the EffectAreas an EffectList creates give, and how long they last."""
    pools = []
    for entry in effect_list["m_effectPrefabs"]:
        go = _ref(entry["m_prefab"])
        if not entry["m_enabled"] or go is None:
            continue
        rows = game.live(go)
        lasts = next((row["data"]["m_timeout"] for row in rows if row["class"] == "TimedDestruction"), None)
        for row in rows:
            if row["class"] == "EffectArea" and row["data"]["m_statusEffect"]:
                pool = {"statusEffect": row["data"]["m_statusEffect"]}
                if lasts:
                    pool["duration"] = _number(lasts)
                pools.append(pool)
    return pools


def _left(game, attack):
    """Pools the attack's projectile leaves where it hits."""
    go = _ref(attack["m_attackProjectile"]) if attack["m_attackType"] == PROJECTILE else None
    rows = [row for row in game.live(go) if row["class"] == "Projectile"] if go else []
    return [pool for row in rows for pool in _pools(game, row["data"]["m_hitEffects"])]


# ---------------------------------------------------------------------- attacks
def _ai(shared):
    ai = {}
    for key, field, default in AI_FIELDS:
        value = bool(shared[field]) if isinstance(default, bool) else _number(shared[field])
        if value != default:
            ai[key] = value
    least, most = _number(shared["m_aiMinHealthPercentage"]), _number(shared["m_aiMaxHealthPercentage"])
    if least > 0 or most < 1:
        ai["health"] = [least, most]
    return ai


def _chain(attack, kills_self):
    """Damage of the last swing of a chain: x2 hard-coded for melee (DoMeleeAttack),
    m_lastChainDamageMultiplier for area (DoAreaAttack), nothing for projectiles. An attack that kills
    its user never gets a second swing."""
    length = attack["m_attackChainLevels"]
    if length <= 1 or kills_self:
        return None
    if attack["m_attackType"] in (HORIZONTAL, VERTICAL):
        return {"length": length, "lastMultiplier": 2}
    if attack["m_attackType"] == AREA and attack["m_lastChainDamageMultiplier"] > 1:
        return {"length": length, "lastMultiplier": _number(attack["m_lastChainDamageMultiplier"])}
    return None


def _kind(attack_type, hits, delivered):
    """`delivered` keeps the hits without damage: a projectile that only carries what it spawns still flies."""
    if not hits:
        return "summon"
    if attack_type in (HORIZONTAL, VERTICAL):
        return "melee"
    if attack_type != AREA and any(h["source"] == "projectile" for h in delivered):
        return "projectile"
    return "area"


def _delivered(game, shared, attack):
    """(hits, summons) of one use of the attack, its effects aside."""
    attack_type = attack["m_attackType"]
    base = _hit(shared["m_damages"], attack["m_damageMultiplier"], shared["m_blockable"], shared["m_dodgeable"],
                "attack", "weapon", attack["m_staggerMultiplier"])
    chance = attack["m_spawnOnHitChance"]
    extra = _ref(attack["m_spawnOnHit"]) if chance > 0 else None
    if attack_type == PROJECTILE:
        setup = {"hit": base, "owner": True, "spawnOnHit": (extra, chance) if extra else None}
        return _fired(game, _spawn(game, _ref(attack["m_attackProjectile"]), "root", setup), attack)
    if attack_type not in (HORIZONTAL, VERTICAL, AREA):
        return [], []  # None and TriggerProjectile attacks hit nothing themselves
    owned = {"hit": None, "owner": True}  # what an attack spawns gets the creature as owner, no hit
    found = [([base], []), _spawn(game, _ref(attack["m_spawnOnTrigger"]), "root", owned)]
    if attack_type != AREA:
        found.append(_spawn(game, _ref(shared["m_spawnOnHit"]), "root", owned))
    found.append(_on_chance(_spawn(game, extra, "children", owned), chance))
    return _merge(found)


def _capped(summons):
    for summon in summons:
        cap = summon.pop("cap")
        if cap > 0:  # SpawnAbility skips a prefab once m_maxSpawned of it are alive
            summon["min"], summon["max"] = min(summon["min"], cap), min(summon["max"], cap)
    return summons


def _attack(game, item, health, death):
    shared = item["data"]["m_itemData"]["m_shared"]
    attack = shared["m_attack"]
    hits, summons = _delivered(game, shared, attack)
    for holder in (shared, attack):
        for field in EFFECTS:
            if field in holder:
                more_hits, more_summons = _effects(game, holder[field])
                hits, summons = hits + more_hits, summons + more_summons
    kills_self = bool(attack["m_attackKillsSelf"]) or attack["m_selfDamage"] >= health  # Attack.Stop, OnAttackTrigger
    if kills_self:
        hits += [dict(hit, onDeath=True) for hit in death]
    delivered = hits
    hits, summons = [hit for hit in hits if _deals_damage(hit)], _capped(summons)
    if not hits and not summons:
        return None

    found = {"id": item["go"], "kind": _kind(attack["m_attackType"], hits, delivered), "hits": hits}
    if summons:
        found["summons"] = summons
    if kills_self:
        found["killsSelf"] = True
    pools = [dict(p) for p in {tuple(sorted(p.items())): p for p in _left(game, attack)}.values()]
    if pools:
        found["leaves"] = pools
    status = shared["m_attackStatusEffect"]
    if _ref(status) and any(hit["scaling"] == "attack" for hit in hits):  # the attack's HitData carries it
        found["statusEffect"] = {"id": status.get("_name"), "chance": _number(shared["m_attackStatusEffectChance"])}
    ai = _ai(shared)
    if ai:
        found["ai"] = ai
    chain = _chain(attack, kills_self)
    if chain:
        found["chain"] = chain
    found["animation"] = {"name": attack["m_attackAnimation"], "random": attack["m_attackRandomAnimations"],
                          "chain": attack["m_attackChainLevels"]}
    return found


def _item_refs(humanoid):
    refs = [p for field in ITEM_LISTS for p in humanoid.get(field, [])]
    refs += [p for item_set in humanoid.get("m_randomSets", []) for p in item_set["m_items"]]
    refs += [item["m_prefab"] for item in humanoid.get("m_randomItems", [])]
    return list(dict.fromkeys(_ref(p) for p in refs if _ref(p)))


def _attacks(game, humanoid, death):
    attacks = []
    for go in _item_refs(humanoid["data"]):
        item = game.first(go, ("ItemDrop",))
        if item is None:
            continue
        shared = item["data"]["m_itemData"]["m_shared"]
        if shared["m_itemType"] not in WEAPON_TYPES or shared["m_aiTargetType"] != ENEMY:
            continue  # heals and buffs only target friends
        if _never_aimed(shared):
            continue
        found = _attack(game, item, humanoid["data"]["m_health"], death)
        if found:
            attacks.append(found)
    return attacks


def _never_aimed(shared):
    """BaseAI.IsLookingAt: Vector3.Angle(...) < m_aiAttackMaxAngle, xor m_aiInvertAngleCheck; an angle lies
    between 0 and 180."""
    angle = shared["m_aiAttackMaxAngle"]
    return angle >= 180 if shared["m_aiInvertAngleCheck"] else angle <= 0


def _trample(game, humanoid):
    """{"minSpeed", "hits"} of the creature's MovementDamage, None without one or when it hits nobody."""
    for row in game.live(humanoid["go_ref"]):
        if row["class"] != "MovementDamage":
            continue
        damager = _ref(row["data"]["m_runDamageObject"])
        hits = [hit for aoe in game.on.get(damager, []) if aoe["class"] == "Aoe"
                for hit in _aoe(game, aoe["data"], {"hit": None, "owner": True})]
        if hits:
            return {"minSpeed": _number(row["data"]["m_speedTreshold"]), "hits": hits}
    return None


def _death(game, humanoid):
    """(hits, summons) of the creature's death: its death effects, then the creatures it drops."""
    hits, summons = _effects(game, humanoid["data"]["m_deathEffects"])
    return [hit for hit in hits if _deals_damage(hit)], _capped(summons) + _dropped(game, humanoid)


def _dropped(game, humanoid):
    summons = []
    for row in game.live(humanoid["go_ref"]):
        if row["class"] != "CharacterDrop":
            continue
        for drop in row["data"]["m_drops"]:
            go = _ref(drop["m_prefab"])
            if drop["m_chance"] <= 0 or not game.first(go, CHARACTERS):
                continue
            low, high = drop["m_amountMin"], drop["m_amountMax"]
            summon = {"id": game.name(go), "min": low, "max": high - 1 if high > low else low}
            if drop["m_chance"] < 1:
                summon["chance"] = _number(drop["m_chance"])
            if drop["m_levelMultiplier"] and not drop.get("m_levelMultiplierNotAmount"):
                summon["doublesPerStar"] = True
            summons.append(summon)
    return summons


def creature_attacks(index, characters, found=None):
    """{prefab: {"attacks": [attack], "onDeath": [hit]}} for the character rows (components rows of the
    Humanoid and Character prefabs, flagged "humanoid"); `found` is a components.collect of at least
    CLASSES, collected here when not given (`index` is kept for the callers).

    attack: {"id", "kind": melee | area | projectile | summon, "hits", "summons"?: [{"id", "min", "max",
    "chance"?, "afterMiss"?}], "killsSelf"?, "statusEffect"?: {"id", "chance"}, "ai"?: the fields that
    differ from AI_DEFAULTS, "chain"?: {"length", "lastMultiplier"}, "animation": {"name", "random",
    "chain"}, "leaves"?: [{"statusEffect", "duration"?}]}; the entry also gets "trample": {"minSpeed",
    "hits"} with a MovementDamage, and "deathSummons" when its death brings creatures.
    hit: {"damages", "trueDamage"?, "toolDamage"?, "staggerMultiplier", "blockable", "dodgeable", "scaling": attack |
    world | none, "source": weapon | projectile | aoe | impact, "radius"?, "count"?, "countMin"?, "bursts"?:
    {"count", "every"}, "ticks"?: {"every", "max"?, "delay"?}, "chance"? (of each one), "afterMiss"?,
    "onDeath"?}.
    """
    game = _Prefabs(found or components.collect(CLASSES))
    game.step = source.fixed_timestep()
    result = {}
    for row in characters:
        humanoid = game.by_id.get((row["cab"], row["pid"]))
        if not row.get("humanoid") or humanoid is None or row["go"] in result:
            continue
        death, death_summons = _death(game, humanoid)
        result[row["go"]] = {"attacks": _attacks(game, humanoid, death), "onDeath": death}
        if death_summons:
            result[row["go"]]["deathSummons"] = death_summons
        trample = _trample(game, humanoid)
        if trample:
            result[row["go"]]["trample"] = trample
    return result
