"""Characterisation tests of the assembled game.json: they pin combat values read in the game data and
code (1.0.21). The modules have their own tests (attacks, spawns, arsenal, animation, localization).

They read the local Valheim install (read-only) and are skipped when it is not found.
Run from tools/extract:  python -m unittest discover -s tests -v
"""
import unittest

from combat_extract import source


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class ExtractCombatTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import build, curation
        cls.curation = curation.load()
        cls.data, cls.report = build.build(source.index(), cls.curation)
        cls.creatures = {c["id"]: c for c in cls.data["creatures"]}
        cls.blockers = {b["id"]: b for b in cls.data["blockers"]}

    def attack(self, creature, attack_id):
        return next(a for a in self.creatures[creature]["attacks"] if attack_id in a["ids"])

    def attack_ids(self, creature):
        return {i for a in self.creatures[creature]["attacks"] for i in a["ids"]}

    # ------------------------------------------------------------------ creatures
    def test_troll_staggers_at_180(self):
        troll = self.creatures["Troll"]
        self.assertEqual(troll["health"], 600)
        self.assertAlmostEqual(troll["health"] * troll["staggerFactor"], 180, places=3)

    def test_modifiers_keep_only_what_differs_from_normal(self):
        self.assertEqual(
            self.creatures["Troll"]["modifiers"],
            {"blunt": "resistant", "pierce": "weak", "spirit": "immune"},
        )

    def test_tool_modifiers_are_kept_apart(self):
        self.assertEqual(self.creatures["StoneGolem"]["toolModifiers"], {"pickaxe": "veryWeak"})
        self.assertNotIn("toolModifiers", self.creatures["Troll"])

    def test_weak_spots_replace_the_creature_modifiers(self):
        self.assertEqual(
            self.creatures["Troll"]["weakSpots"],
            [{"part": "head", "name": {"fr": "Tête", "en": "Head"},
              "modifiers": {"pierce": "veryWeak", "spirit": "immune"}}],
        )

    def test_a_weak_spot_under_an_inactive_object_never_applies(self):
        # TrollFrost's m_weakSpots points to a WeakSpot under the inactive Visual_OLD: its Awake never sets
        # the collider FindWeakSpotIndex compares.
        self.assertNotIn("weakSpots", self.creatures["TrollFrost"])

    def test_boss_phases_keep_their_own_stats_and_attacks(self):
        kall = self.creatures["FrozenKing"]
        self.assertEqual(kall["health"], 10000)
        self.assertEqual([p["id"] for p in kall["phases"]], ["FrozenKing_p2", "FrozenKing_p3"])
        between, last = kall["phases"]
        self.assertEqual((between["health"], between["attacks"]), (7000, []))
        self.assertEqual(set(between["modifiers"].values()), {"immune"})
        self.assertEqual(last["health"], 30000)
        self.assertIn("FrozenKing_ChainFlurry", {i for a in last["attacks"] for i in a["ids"]})
        self.assertNotIn("FrozenKing_ChainFlurry", self.attack_ids("FrozenKing"))

    def test_a_phase_that_takes_no_player_damage_is_ended_by_what_the_previous_one_summons(self):
        # Kall's death brings Aspect_Eikthyr, whose death brings the next aspects; their explosions drain
        # phase 2, which no player damage reaches.
        kall = self.creatures["FrozenKing"]
        self.assertEqual([s["id"] for s in kall["deathSummons"]], ["Aspect_Eikthyr"])
        self.assertEqual(kall["deathSummons"][0]["name"]["en"], "Aspect of the Lightning Stag")
        self.assertEqual({s["id"] for s in self.creatures["Aspect_Eikthyr"]["deathSummons"]},
                         {"Aspect_Elder", "Aspect_Bonemass"})

    def test_creatures_dropped_on_death_come_with_it(self):
        self.assertEqual([s["id"] for s in self.creatures["BlobElite"]["deathSummons"]], ["Blob"])

    def test_a_summon_with_a_plain_text_name_shows_it(self):
        tendrils = next(a for a in self.creatures["FrozenKing"]["phases"][1]["attacks"]
                        if "FrozenKing_tendrilspawn" in a["ids"])
        self.assertEqual(tendrils["summons"][0]["name"], {"fr": "Tendril", "en": "Tendril"})

    def test_pools_an_attack_leaves_are_described(self):
        spit = self.attack("SeekerQueen", "SeekerQueen_Spit")
        self.assertEqual(spit["leaves"], [{"statusEffect": "Slimed", "duration": 10.5}])
        self.assertEqual(self.data["statusEffects"]["Slimed"]["modifiers"], {"fire": "veryWeak"})

    def test_variants_joined_to_a_creature_share_its_stats(self):
        self.assertEqual(self.report.divergent, [])

    def test_a_running_creature_tramples(self):
        self.assertEqual(self.creatures["Lox"]["trample"]["minSpeed"], 5)

    def test_a_parry_staggers_only_a_creature_that_can_play_a_stagger(self):
        self.assertTrue(self.creatures["Troll"]["staggerable"])
        self.assertTrue(self.creatures["Troll"]["staggeredByParry"])
        self.assertFalse(self.creatures["Blob"]["staggerable"])
        self.assertFalse(self.creatures["Blob"]["staggeredByParry"])

    def test_biomes_come_from_the_game_data(self):
        self.assertEqual(set(self.creatures["Draugr"]["biomes"]), {"meadows", "swamp"})
        self.assertEqual(set(self.creatures["Bat"]["biomes"]), {"mountain", "swamp"})  # with Bat_Swamp
        self.assertIn("meadows", self.creatures["Skeleton_Meadows_noarcher"]["biomes"])

    def test_conditional_appearances_are_listed_apart(self):
        sources = {c["source"] for c in self.creatures["JotunWarrior"]["conditional"]}
        self.assertIn("event:jotun_invasion", sources)

    def test_star_range_and_fixed_level(self):
        self.assertEqual(self.creatures["Troll"]["stars"], {"min": 0, "max": 2})
        self.assertEqual(self.creatures["Charred_Melee_Dyrnwyn"]["level"], 3)

    # ------------------------------------------------------------------ attacks
    def test_melee_hit_and_the_area_it_spawns_on_hit(self):
        hits = self.attack("Troll", "troll_groundslam")["hits"]
        self.assertEqual([(h["damages"], h["scaling"]) for h in hits], [({"blunt": 70}, "attack"), ({"blunt": 50}, "world")])

    def test_projectile_takes_the_attack_damage_not_its_own(self):
        bow = self.attack("Charred_Archer", "charred_bow")
        self.assertEqual(bow["kind"], "projectile")
        self.assertEqual(bow["hits"][0]["damages"], {"pierce": 90})

    def test_projectile_impact_adds_a_hit_with_its_own_damage(self):
        hits = self.attack("DvergerMage", "DvergerStaffFire_fireball")["hits"]
        self.assertEqual([(h["damages"], h["blockable"], h["scaling"]) for h in hits],
                         [({"fire": 130}, True, "attack"), ({"fire": 100}, False, "world")])

    def test_spawned_abilities_deal_their_own_damage(self):
        fissure = self.attack("Fader", "Fader_Fissure")["hits"][0]
        self.assertEqual((fissure["damages"], fissure["scaling"]), ({"fire": 120, "spirit": 80}, "none"))
        meteors = self.attack("GoblinKing", "GoblinKing_Meteors")["hits"][0]
        self.assertEqual((meteors["damages"], meteors["count"]), ({"blunt": 40, "fire": 120}, 10))

    def test_valkyrie_spit_hits_with_its_explosion(self):
        spit = self.attack("FallenValkyrie", "fallenvalkyrie_spit")["hits"][0]
        self.assertEqual(spit["damages"], {"fire": 80, "poison": 18})
        self.assertFalse(spit["blockable"])

    def test_explosions_on_death(self):
        self.assertEqual(self.creatures["BlobLava"]["onDeath"][0]["damages"], {"blunt": 70, "fire": 30})
        self.assertEqual(self.creatures["Writhan"]["onDeath"][0]["damages"], {"blunt": 60, "poison": 40})

    def test_true_damage_is_kept_apart(self):
        mace = self.attack("Skeleton_DeepNorth", "skeleton_mace_DeepNorth")["hits"][0]
        self.assertEqual((mace["damages"], mace["trueDamage"]), ({"blunt": 80, "frost": 10}, 15))

    def test_attack_stagger_multiplier_is_kept(self):
        self.assertAlmostEqual(self.attack("Fader", "Fader_Bite")["hits"][0]["staggerMultiplier"], 0.8, places=6)

    def test_an_animation_that_hits_several_times_repeats_the_attack(self):
        rage = self.attack("GoblinBrute", "GoblinBrute_RageAttack")
        self.assertEqual(rage["strikes"]["count"], 3)
        self.assertEqual(rage["strikes"]["times"], [1.93, 2.87, 4.17])  # Speed(1.3) event of its clip

    def test_merged_attacks_list_each_item_once(self):
        self.assertEqual(self.attack("Bat", "bat_melee")["ids"], ["bat_melee"])

    def test_attacks_that_never_hit_are_left_out(self):
        self.assertNotIn("fallenvalkyrie_taunt", self.attack_ids("FallenValkyrie"))  # no Hit event
        self.assertNotIn("SeekerQueen_Teleport", self.attack_ids("SeekerQueen"))  # moves the queen
        self.assertNotIn("Greydwarf_shaman_heal", self.attack_ids("Greydwarf_Shaman"))
        self.assertNotIn("Fenring_taunt", self.attack_ids("Fenring"))
        self.assertNotIn("Morgen_bodyslam", self.attack_ids("Morgen"))  # no transition waits for its trigger
        self.assertNotIn("Barka_Backslam", self.attack_ids("Barka"))  # its aim check never passes

    def test_an_attack_that_kills_its_user_stays_though_its_trigger_plays_nothing(self):
        # The Writhan swaps weapons within a second (EquipBestWeapon), Attack.Stop then kills it.
        explode = self.attack("Writhan", "writhan_explode_aoe")
        self.assertTrue(explode["killsSelf"])
        self.assertTrue(all(hit["onDeath"] for hit in explode["hits"]))  # only its death deals anything

    def test_a_random_variant_that_plays_nothing_lowers_the_chance_of_each_hit(self):
        slap = self.attack("SeekerQueen", "SeekerQueen_Slap")
        self.assertEqual([h["chance"] for h in slap["hits"]], [0.75])

    def test_a_chain_the_ai_cannot_keep_up_loses_its_last_swing(self):
        # The next swing must start within 0.2 s of the end of the previous one; the AI waits 2 s.
        self.assertNotIn("chain", self.attack("FallenWarrior", "FW_SwordBlackmetal"))
        self.assertEqual(self.attack("FallenWarrior", "FW_KnifeSkollAndHati")["chain"]["length"], 3)

    def test_bursts_stop_with_the_attack(self):
        # blobtar_attack fires 6 bursts 0.22 s apart (0.2 s on fixed steps) from its Hit at 0.26 s, but the
        # attack ends at 1.11 s.
        tar = self.attack("BlobTar", "blobtar_attack")
        self.assertEqual(tar["hits"][0]["bursts"], {"count": 4, "every": 0.22})

    def test_the_call_of_the_queen_summons_seekers(self):
        call = self.attack("SeekerQueen", "SeekerQueen_Call")
        self.assertEqual(sorted(s["id"] for s in call["summons"]), ["Seeker", "SeekerBrood"])

    def test_summons_are_listed(self):
        summons = self.attack("Charred_Mage", "charred_magestaff_summon")["summons"]
        self.assertEqual([s["id"] for s in summons], ["Charred_Twitcher_Summoned"])

    def test_identical_attacks_are_merged(self):
        bites = [a for a in self.creatures["Wolf"]["attacks"] if a["hits"][0]["damages"] == {"slash": 70}]
        self.assertEqual(len(bites), 1)
        self.assertEqual(len(bites[0]["ids"]), 3)

    def test_status_effects_are_described(self):
        self.assertEqual(self.attack("BlobTar", "blobtar_attack")["statusEffect"]["id"], "Tared")
        self.assertEqual(self.data["statusEffects"]["Tared"]["name"]["fr"], "Goudronné")

    # ------------------------------------------------------------------ arsenal, player, world
    def test_round_shield_values(self):
        silver = self.blockers["ShieldSilver"]
        self.assertEqual((silver["blockPower"], silver["blockPowerPerLevel"], silver["timedBlockBonus"]), (60, 6, 1.5))
        self.assertEqual(silver["group"], "round")

    def test_serpent_scale_shield_resists_pierce(self):
        self.assertEqual(self.blockers["ShieldSerpentscale"]["modifiers"], {"pierce": "resistant"})

    def test_bare_hands_block_too(self):
        self.assertEqual(self.blockers["PlayerUnarmed"]["group"], "unarmed")

    def test_items_without_a_source_are_left_out(self):
        self.assertNotIn("KnifeVoid", self.blockers)

    def test_player_values_match_the_engine(self):
        player = self.data["player"]
        self.assertEqual((player["blockStaminaDrain"], player["perfectBlockStaminaDrain"], player["staggerFactor"]), (10, 0, 0.4))
        self.assertEqual(player["modifiers"], {"spirit": "immune"})

    def test_world_presets_come_from_the_combat_slider(self):
        presets = {p["id"]: p for p in self.data["world"]["presets"]}
        self.assertEqual((presets["veryHard"]["enemyDamage"], presets["veryHard"]["playerDamage"]), (2, 0.7))
        self.assertEqual(presets["veryHard"]["name"]["fr"], "Très difficile")
        self.assertEqual(self.data["world"]["maxPlayers"], 5)

    def test_world_presets_carry_the_star_chance(self):
        rates = [p["levelUpRate"] for p in self.data["world"]["presets"]]
        self.assertEqual(rates, [1, 1, 1, 1.2, 1.4])

    def test_world_presets_carry_the_enemy_size_and_speed(self):
        rates = [p["enemySpeedSize"] for p in self.data["world"]["presets"]]
        self.assertEqual(rates, [0.9, 0.95, 1, 1.1, 1.2])

    def test_world_presets_name_the_start_presets_that_pick_them_under_another_name(self):
        presets = {p["id"]: p["worldPresets"] for p in self.data["world"]["presets"]}
        self.assertEqual(presets["veryEasy"], [{"fr": "Tranquille", "en": "Casual"}])
        self.assertEqual(presets["veryHard"], [{"fr": "Cauchemar", "en": "Hardcore"}])
        self.assertEqual((presets["easy"], presets["normal"], presets["hard"]), ([], [], []))

    def test_rule_effects_are_every_power_and_the_drinks_trinkets_and_sets_that_change_a_fight(self):
        # Eikthyr's and The Elder's powers change no hit (the stamina of a run, a jump or a swim; health
        # regeneration and tool damage), yet a player carries one of the seven.
        physical = ("blunt", "slash", "pierce")
        slightly_resistant = {t: "slightlyResistant" for t in physical}
        effects = {e["name"]["en"]: {k: v for k, v in e.items() if k != "name"} for e in self.data["ruleEffects"]}
        self.assertEqual(effects, {
            "Eikthyr": {"id": "GP_Eikthyr", "kind": "power", "ttl": 300, "cooldown": 1200},
            "The Elder": {"id": "GP_TheElder", "kind": "power", "ttl": 300, "cooldown": 1200},
            "Bonemass": {"id": "GP_Bonemass", "kind": "power", "ttl": 300, "cooldown": 1200,
                         "modifiers": slightly_resistant, "blockStaminaModifier": -1, "blockStaminaFlat": -5},
            "Fader": {"id": "GP_Fader", "kind": "power", "ttl": 300, "cooldown": 1200,
                      "modifiers": {"fire": "resistant"}, "staggerModifier": -0.5},
            "Moder": {"id": "GP_Moder", "kind": "power", "ttl": 300, "cooldown": 1200, "modifiers": {"frost": "resistant"}},
            "The Queen": {"id": "GP_Queen", "kind": "power", "ttl": 300, "cooldown": 1200,
                          "modifiers": {"poison": "resistant"}},
            "Yagluth": {"id": "GP_Yagluth", "kind": "power", "ttl": 300, "cooldown": 1200,
                        "modifiers": {"lightning": "resistant"}},
            "Berserkir Mead": {"id": "Potion_bzerker", "kind": "consumable", "items": ["MeadBzerker"], "ttl": 20,
                               "modifiers": {t: "weak" for t in physical}, "blockStaminaModifier": -0.8,
                               "dodgeStaminaModifier": -0.8},
            "Fire Resistance Barley Wine": {"id": "Potion_barleywine", "kind": "consumable", "items": ["BarleyWine"],
                                            "ttl": 600, "modifiers": {"fire": "resistant"}},
            "Frost Resistance Mead": {"id": "Potion_frostresist", "kind": "consumable", "items": ["MeadFrostResist"],
                                      "ttl": 600, "modifiers": {"frost": "resistant"}},
            "Poison Resistance Mead": {"id": "Potion_poisonresist", "kind": "consumable", "items": ["MeadPoisonResist"],
                                       "ttl": 600, "modifiers": {"poison": "veryResistant"}},
            "Crystal Heart": {"id": "TrinketSilverResist", "kind": "trinket", "items": ["TrinketSilverResist"],
                              "adrenaline": 80, "ttl": 50, "modifiers": slightly_resistant},
            "Evasion Mantle": {"id": "TrinketBlackStamina", "kind": "trinket", "items": ["TrinketBlackStamina"],
                               "adrenaline": 60, "ttl": 120, "parryBonus": 0.5, "blockStaminaModifier": -0.5},
            "Iron Brooch": {"id": "TrinketIronHealth", "kind": "trinket", "items": ["TrinketIronHealth"],
                            "adrenaline": 65, "ttl": 30, "addArmor": 20},
            "Neckstabber": {"id": "TrinketBloodGoldHealth", "kind": "trinket", "items": ["TrinketBloodGoldHealth"],
                            "adrenaline": 65, "ttl": 30, "addArmor": 20},
            "Berserk": {"id": "SetEffect_BerserkerArmor", "kind": "set", "set": {"id": "berserker_armor", "size": 3},
                        "modifiers": {t: "slightlyWeak" for t in physical}},
            "Fenris blessing": {"id": "SetEffect_FenringArmor", "kind": "set", "set": {"id": "fenring_armor", "size": 3},
                                "modifiers": {"fire": "resistant"}},
            "Vanguard": {"id": "SetEffect_DeepNorthMediumArmor", "kind": "set",
                         "set": {"id": "DeepNorthMediumArmor", "size": 3}, "dodgeStaminaModifier": -0.2},
            "Vilebone Wrath": {"id": "SetEffect_BerserkerUndeadArmor", "kind": "set",
                               "set": {"id": "berserker_armor_undead", "size": 3},
                               "modifiers": {t: "slightlyWeak" for t in physical}},
        })

    def test_rule_effects_keep_the_names_of_the_game(self):
        names = {e["name"]["en"]: e["name"]["fr"] for e in self.data["ruleEffects"]}
        self.assertEqual((names["Fader"], names["The Elder"], names["Evasion Mantle"], names["Iron Brooch"]),
                         ("Pouvoir de Fader", "L'Aîné", "Voile d'ombre", "Broche en fer"))

    def test_freezing_wears_the_player_down_where_the_weather_freezes(self):
        self.assertEqual(self.data["freezing"], {
            "name": {"fr": "En train de geler", "en": "Freezing"},
            "damagePerSecond": 1,
            "healthRegen": 0,
            "biomes": ["mountain"],
        })

    def test_burning_spirit_and_poison_deal_what_a_hit_leaves_the_player_over_time(self):
        self.assertEqual(self.data["player"]["overTime"], {
            "burning": {"ttl": 5, "interval": 1},
            "spirit": {"ttl": 3, "interval": 0.5},
            "poison": {"baseTtl": 1, "ttlPerDamage": 5, "ttlPower": 0.5, "interval": 1},
        })

    def test_armor_pieces_are_listed_apart_from_the_effects(self):
        pieces = {p["id"]: p for p in self.data["armorPieces"]}
        self.assertEqual(len(pieces), 113)
        self.assertEqual(pieces["CapeAsh"]["blockStaminaModifier"], -0.2)
        self.assertNotIn("equipment", {e["kind"] for e in self.data["ruleEffects"]})

    def test_the_forge_of_potential_is_named(self):
        self.assertEqual(self.data["forge"], {"name": {"fr": "Forge du potentiel", "en": "Forge of Potential"}})

    # ------------------------------------------------------------------ names
    def test_names_come_from_the_game_localisation(self):
        self.assertEqual(self.creatures["Greydwarf_Elite"]["name"], {"fr": "Brute naingris", "en": "Greydwarf Brute"})
        self.assertEqual(self.data["damageTypes"]["frost"], {"fr": "Glace", "en": "Frost"})
        self.assertEqual(self.data["biomes"][0], {"id": "meadows", "name": {"fr": "Prairies", "en": "Meadows"}})
        self.assertEqual(self.data["modifiers"]["slightlyWeak"], {"fr": "Légèrement faible", "en": "Slightly weak"})

    def test_attacks_with_a_game_item_use_its_name(self):
        sword = self.attack("FallenWarrior", "FW_SwordBlackmetal")
        self.assertEqual(sword["name"]["fr"], "Épée en sombracier")

    def test_names_lose_their_colour_tags(self):
        self.assertEqual(self.creatures["Skeleton_Hildir"]["name"]["en"], "Brenna")

    def test_attacks_of_one_creature_have_distinct_names(self):
        clashes = []
        for c in self.data["creatures"]:
            for attacks in [c["attacks"]] + [p["attacks"] for p in c.get("phases", [])]:
                for lang in ("en", "fr"):
                    names = [a["name"][lang] for a in attacks]
                    clashes += [(c["id"], lang, n) for n in set(names) if names.count(n) > 1]
        self.assertEqual(sorted(clashes), [])

    def test_every_attack_has_a_name_in_both_languages(self):
        unnamed = [(c["id"], a["ids"][0]) for c in self.data["creatures"] for a in c["attacks"]
                   if not (a["name"].get("fr") and a["name"].get("en"))]
        self.assertEqual(unnamed, [])

    def test_every_weak_spot_has_a_name_in_both_languages(self):
        # The game names no body part: curation.json does.
        spots = [(f.get("id"), s["part"], s.get("name", {})) for c in self.data["creatures"]
                 for f in [c] + c.get("phases", []) for s in f.get("weakSpots", [])]
        self.assertEqual([(f, part) for f, part, name in spots if not (name.get("fr") and name.get("en"))], [])
        self.assertEqual({part for _, part, _ in spots}, {"head", "ass", "eggs"})
        self.assertEqual(self.report.unnamed_parts, [])

    def test_creatures_a_biome_lists_beside_a_namesake_carry_their_home_biome(self):
        # The game names every skeleton « Skeleton »: curation.json gives the biome-bound ones met beside the
        # common one their biome; the Deep North's, alone there, needs none.
        skeletons = {c["id"]: c.get("origin") for c in self.data["creatures"] if c["name"]["en"] == "Skeleton"}
        self.assertEqual(skeletons, {"Skeleton_Meadows_noarcher": "meadows", "Skeleton": None,
                                     "Skeleton_Swamps": "swamp", "Skeleton_Mountains": "mountain",
                                     "Skeleton_DeepNorth": None})

    def test_no_biome_lists_two_creatures_that_read_alike(self):
        self.assertEqual(self.report.namesakes, [])

    # ------------------------------------------------------------------ curation
    def test_every_included_creature_has_a_biome_and_an_attack(self):
        self.assertEqual([c["id"] for c in self.data["creatures"] if not c["biomes"] or not c["attacks"]], [])

    def test_every_hostile_creature_with_attacks_is_curated(self):
        self.assertEqual(self.report.uncurated, [])

    def test_every_curated_creature_is_met_somewhere(self):
        self.assertEqual(self.report.unplaced, [])

    def test_curated_names_are_only_those_the_game_lacks(self):
        self.assertEqual(self.report.unused_names, [])
        self.assertEqual(self.report.unused_parts, [])

    def test_ignored_creatures_are_prefabs_of_the_game(self):
        self.assertEqual(self.report.stale_ignored, [])

    def test_game_version_is_recorded(self):
        self.assertEqual(self.data["game"]["version"], "1.0.21")


if __name__ == "__main__":
    unittest.main()
