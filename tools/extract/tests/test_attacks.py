"""Creature attacks as the 1.0.21 code deals them, pinned on values read in the game data.

They read the local Valheim install (read-only) and are skipped when it is not found.
Run from tools/extract:  python -m unittest tests.test_attacks -v
"""
import unittest

from combat_extract import source


@unittest.skipUnless(source.is_installed(), "Valheim install not found (set VALHEIM_INSTALL)")
class AttacksTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from combat_extract import attacks, components
        found = components.collect(attacks.CLASSES)
        characters = [
            {"go": r["go"], "bundle": r["bundle"], "cab": r["cab"], "pid": r["pid"], "humanoid": True}
            for r in found.rows("Humanoid")
            if r["go"] == r["root"]
        ]
        cls.creatures = attacks.creature_attacks(source.index(), characters, found)

    def attack(self, creature, attack_id):
        found = [a for a in self.creatures[creature]["attacks"] if a["id"] == attack_id]
        self.assertEqual(len(found), 1, "%s has no attack %s" % (creature, attack_id))
        return found[0]

    def ids(self, creature):
        return {a["id"] for a in self.creatures[creature]["attacks"]}

    # ------------------------------------------------------------------ the attack's own hit
    def test_melee_hit_scales_with_the_attack(self):
        bite = self.attack("Fader", "Fader_Bite")
        self.assertEqual(bite["kind"], "melee")
        self.assertEqual(
            bite["hits"],
            [{"damages": {"pierce": 210}, "toolDamage": 600, "staggerMultiplier": 0.8, "blockable": True,
              "dodgeable": True, "scaling": "attack", "source": "weapon"}],
        )

    def test_melee_attack_ignores_its_projectile_field(self):
        spray = self.attack("Greydwarf_Shaman", "Greydwarf_shaman_attack")
        self.assertEqual(spray["kind"], "melee")
        self.assertEqual(len(spray["hits"]), 1)
        self.assertEqual(spray["hits"][0]["damages"], {"poison": 30})
        self.assertFalse(spray["hits"][0]["blockable"])

    def test_generic_damage_is_true_damage_outside_the_typed_damages(self):
        mace = self.attack("Skeleton_DeepNorth", "skeleton_mace_DeepNorth")
        self.assertEqual(mace["hits"][0]["damages"], {"blunt": 80, "frost": 10})
        self.assertEqual(mace["hits"][0]["trueDamage"], 15)

    def test_chop_and_pickaxe_are_kept_apart_for_the_magic_barrier(self):
        # SE_Shield.OnDamaged counts HitData.GetTotalDamage, which adds them, though no player takes them.
        stomp = self.attack("Lox", "lox_stomp")["hits"][0]
        self.assertEqual((stomp["damages"], stomp["toolDamage"]), ({"blunt": 120}, 200))
        self.assertNotIn("toolDamage", self.attack("Lox", "lox_bite")["hits"][0])
        self.assertEqual(self.attack("Eikthyr", "Eikthyr_antler")["hits"][0]["toolDamage"], 2000)

    def test_projectile_takes_the_attack_hit_over_its_own_damage(self):
        bow = self.attack("Charred_Archer", "charred_bow")
        self.assertEqual(bow["kind"], "projectile")
        self.assertEqual(bow["hits"][0]["damages"], {"pierce": 90})
        self.assertEqual((bow["hits"][0]["scaling"], bow["hits"][0]["source"]), ("attack", "projectile"))

    def test_area_fired_as_projectile_keeps_the_attack_settings(self):
        flames = self.attack("Fenring_Cultist", "Fenring_attack_flames")
        self.assertEqual(flames["kind"], "area")
        self.assertEqual(
            flames["hits"],
            [{"damages": {"fire": 50}, "staggerMultiplier": 1, "blockable": False, "dodgeable": True,
              "scaling": "attack", "source": "aoe", "ticks": {"every": 0.5, "max": 4}}],
        )

    def test_lingering_area_with_the_attack_settings_ticks_for_its_lifetime(self):
        aoe = self.attack("Bonemass", "bonemass_attack_aoe")
        self.assertEqual(
            aoe["hits"],
            [{"damages": {"poison": 130}, "staggerMultiplier": 1, "blockable": False, "dodgeable": False,
              "scaling": "attack", "source": "aoe", "radius": 9, "ticks": {"every": 1.02, "max": 15}}],
        )

    def test_area_fired_as_projectile_with_its_own_damage_scales_with_the_world_only(self):
        nova = self.attack("Fenring_Cultist_Hildir", "Fenring_attack_IceNova")
        self.assertEqual(nova["kind"], "area")
        self.assertEqual(
            nova["hits"],
            [{"damages": {"frost": 90}, "staggerMultiplier": 1, "blockable": False, "dodgeable": False,
              "scaling": "world", "source": "aoe", "radius": 5, "bursts": {"count": 3, "every": 1.48}}],
        )

    # ------------------------------------------------------------------ what a hit spawns
    def test_melee_spawn_on_hit_adds_an_area_with_its_own_damage(self):
        slam = self.attack("Troll", "troll_groundslam")
        self.assertEqual(
            slam["hits"],
            [
                {"damages": {"blunt": 70}, "toolDamage": 140, "staggerMultiplier": 1, "blockable": True,
                 "dodgeable": True, "scaling": "attack", "source": "weapon"},
                {"damages": {"blunt": 50}, "toolDamage": 80, "staggerMultiplier": 1, "blockable": True,
                 "dodgeable": True, "scaling": "world", "source": "aoe", "radius": 3},
            ],
        )

    def test_frost_troll_slam_area_deals_220(self):
        slam = self.attack("TrollFrost", "trollsnow_groundslam")
        self.assertEqual(slam["hits"][1]["damages"], {"blunt": 220})
        self.assertEqual(slam["hits"][1]["radius"], 10)

    def test_projectile_impact_area_keeps_its_own_damage_without_inherited_hit(self):
        fireball = self.attack("DvergerMage", "DvergerStaffFire_fireball")
        self.assertEqual([h["damages"] for h in fireball["hits"]], [{"fire": 130}, {"fire": 100}])
        self.assertEqual([h["scaling"] for h in fireball["hits"]], ["attack", "world"])
        self.assertEqual(fireball["hits"][1]["ticks"], {"every": 1.02, "max": 8})

    def test_impact_area_of_an_empty_projectile_is_the_whole_attack(self):
        spit = self.attack("FallenValkyrie", "fallenvalkyrie_spit")
        self.assertEqual(
            spit["hits"],
            [{"damages": {"fire": 80, "poison": 18}, "staggerMultiplier": 1, "blockable": False, "dodgeable": True,
              "scaling": "world", "source": "aoe", "radius": 2, "bursts": {"count": 3, "every": 0.92},
              "ticks": {"every": 1.02, "max": 10}}],
        )

    def test_a_projectile_that_only_carries_its_impact_area_is_still_a_projectile(self):
        # fallenvalkyrie_spit fires fallenvalkyrie_spit_projectile at 14 m/s; its own hit is empty and the
        # fire pool it spawns on impact deals the damage, as DvergerStaffFire_fireball's field does.
        self.assertEqual(self.attack("FallenValkyrie", "fallenvalkyrie_spit")["kind"], "projectile")

    def test_projectiles_per_burst_and_bursts_carry_down_to_impact_areas(self):
        cluster = self.attack("DvergerMage", "DvergerStaffFire_clusterbomb")
        self.assertEqual(cluster["kind"], "projectile")
        bomb, fire = cluster["hits"]
        self.assertEqual((bomb["damages"], bomb["scaling"]), ({"fire": 100}, "attack"))
        self.assertEqual((bomb["count"], bomb["bursts"]), (3, {"count": 3, "every": 0.52}))
        self.assertEqual((fire["damages"], fire["scaling"], fire["source"]), ({"fire": 100}, "world", "aoe"))
        self.assertEqual(
            (fire["count"], fire["bursts"], fire["ticks"]), (3, {"count": 3, "every": 0.52}, {"every": 1.02, "max": 8}),
        )

    def test_bursts_of_a_single_projectile(self):
        shoot = self.attack("gd_king", "gd_king_shoot")
        self.assertEqual(shoot["hits"][0]["damages"], {"pierce": 35})
        self.assertEqual(shoot["hits"][0]["bursts"], {"count": 25, "every": 0.12})
        self.assertNotIn("count", shoot["hits"][0])

    def test_projectile_flying_through_hits_every_interval(self):
        bolt = self.attack("JotunWitch", "JotunWitch_attack_lightningbolt")
        self.assertEqual(
            bolt["hits"],
            [{"damages": {"lightning": 110, "spirit": 15}, "toolDamage": 20, "staggerMultiplier": 1, "blockable": True,
              "dodgeable": True, "scaling": "attack", "source": "projectile", "radius": 3, "ticks": {"every": 0.52}}],
        )

    # ------------------------------------------------------------------ SpawnAbility
    def test_spawned_areas_have_no_owner_and_never_scale(self):
        fissure = self.attack("Fader", "Fader_Fissure")
        self.assertEqual(fissure["kind"], "area")
        self.assertEqual(
            fissure["hits"],
            [{"damages": {"fire": 120, "spirit": 80}, "toolDamage": 80, "staggerMultiplier": 1, "blockable": False,
              "dodgeable": False, "scaling": "none", "source": "aoe", "radius": 11, "count": 15, "countMin": 12,
              "ticks": {"every": 0.52, "max": 29, "delay": 4}}],
        )

    def test_spawned_projectiles_keep_their_own_damage_and_scale_with_the_world(self):
        meteors = self.attack("GoblinKing", "GoblinKing_Meteors")
        self.assertEqual(meteors["kind"], "projectile")
        self.assertEqual(
            meteors["hits"],
            [{"damages": {"blunt": 40, "fire": 120}, "toolDamage": 100, "staggerMultiplier": 1, "blockable": True,
              "dodgeable": True, "scaling": "world", "source": "projectile", "radius": 5, "count": 10}],
        )

    def test_spawn_count_excludes_the_maximum(self):
        rain = self.attack("FrozenKing_p3", "FrozenKing_SpikeRain")
        self.assertEqual(rain["hits"][0]["damages"], {"blunt": 100, "frost": 100})
        self.assertEqual((rain["hits"][0]["countMin"], rain["hits"][0]["count"]), (20, 24))

    def test_area_spawned_on_a_spawned_projectile_impact_has_its_owner(self):
        wall = self.attack("Fader", "Fader_Meteors")["hits"][1]
        self.assertEqual((wall["damages"], wall["scaling"]), ({"fire": 80, "spirit": 80}, "world"))
        # a trigger area hits on contact, then once more each time its hit list clears (Aoe.Update): 1 + 40
        self.assertEqual(wall["ticks"], {"every": 0.5, "max": 41})
        self.assertEqual(self.attack("Fader", "Fader_WallOfFire")["hits"][0]["scaling"], "none")

    def test_summoning_attack_lists_its_summons_and_no_hit(self):
        summon = self.attack("Charred_Mage", "charred_magestaff_summon")
        self.assertEqual(summon["kind"], "summon")
        self.assertEqual(summon["hits"], [])
        self.assertEqual(summon["summons"], [{"id": "Charred_Twitcher_Summoned", "min": 1, "max": 1}])

    def test_summons_multiply_with_bursts(self):
        eggs = self.attack("Gjall", "gjall_attack_egg")
        self.assertEqual(eggs["summons"], [{"id": "Tick", "min": 3, "max": 3}])

    def test_summons_picked_among_several_prefabs_are_capped_by_the_alive_limit(self):
        roar = self.attack("Fader", "Fader_Roar")
        self.assertEqual(
            roar["summons"],
            [{"id": "Charred_Melee_Fader", "min": 0, "max": 7}, {"id": "Charred_Archer_Fader", "min": 0, "max": 7}],
        )

    def test_summons_spawned_on_a_chance_have_no_guaranteed_minimum(self):
        spit = self.attack("SeekerQueen", "SeekerQueen_Spit")
        self.assertEqual(spit["summons"], [{"id": "SeekerBrood", "min": 0, "max": 20, "chance": 0.3}])

    def test_teleport_abilities_are_not_attacks(self):
        self.assertNotIn("SeekerQueen_Teleport", self.ids("SeekerQueen"))

    # ------------------------------------------------------------------ effects and death
    def test_death_explosions_are_owner_less_hits_of_the_creature(self):
        explosion = {"damages": {"blunt": 70, "fire": 30}, "toolDamage": 320, "staggerMultiplier": 1,
                     "blockable": False, "dodgeable": True, "scaling": "none", "source": "aoe", "radius": 6}
        self.assertEqual(self.creatures["BlobLava"]["onDeath"], [explosion])
        self.assertEqual(
            self.creatures["Writhan"]["onDeath"][0]["damages"], {"blunt": 60, "poison": 40},
        )
        self.assertEqual(self.creatures["Troll"]["onDeath"], [])

    def test_self_destruct_explodes_through_its_trigger_effect_and_its_death(self):
        blow_up = self.attack("BlobLava", "blobLava_attack_aoe")
        self.assertEqual(blow_up["kind"], "area")
        explosion = {"damages": {"blunt": 70, "fire": 30}, "toolDamage": 320, "staggerMultiplier": 1,
                     "blockable": False, "dodgeable": True, "scaling": "none", "source": "aoe", "radius": 6}
        self.assertEqual(blow_up["hits"], [explosion, dict(explosion, onDeath=True)])

    def test_disabled_trigger_effect_is_not_followed(self):
        explode = self.attack("Writhan", "writhan_explode_aoe")
        self.assertEqual([h.get("onDeath") for h in explode["hits"]], [True])

    # ------------------------------------------------------------------ attack data
    def test_status_effect_of_the_attack(self):
        self.assertEqual(self.attack("BlobTar", "blobtar_attack")["statusEffect"], {"id": "Tared", "chance": 1})

    def test_ai_keeps_only_what_differs_from_the_defaults(self):
        self.assertEqual(
            self.attack("Fader", "Fader_Fissure")["ai"],
            {"range": 40, "cooldown": 30, "health": [0.35, 0.85], "flying": False},
        )
        self.assertEqual(self.attack("Troll", "troll_throw")["ai"], {"range": 20, "rangeMin": 8, "cooldown": 10})
        self.assertEqual(
            self.attack("Dragon", "dragon_spit_shotgun")["ai"],
            {"range": 25, "rangeMin": 5, "cooldown": 8, "walking": False, "swimming": False},
        )
        self.assertEqual(
            self.attack("Eikthyr", "Eikthyr_charge")["ai"],
            {"range": 15, "cooldown": 25, "swimming": False, "prioritized": True},
        )

    def test_melee_chain_doubles_the_last_hit_whatever_the_item_says(self):
        for item in ("FW_SwordBlackmetal", "FW_KnifeSilver"):  # the knife says x1
            self.assertEqual(self.attack("FallenWarrior", item)["chain"], {"length": 3, "lastMultiplier": 2})

    def test_no_chain_for_projectiles_nor_for_an_attack_that_kills_its_user(self):
        self.assertNotIn("chain", self.attack("FallenWarrior", "FW_StaffFireball"))
        self.assertNotIn("chain", self.attack("ShadowPerson", "SP_SwordBlackmetal"))

    def test_animation_is_kept_for_the_animation_module(self):
        self.assertEqual(
            self.attack("FallenWarrior", "FW_SwordBlackmetal")["animation"],
            {"name": "swing_longsword", "random": 0, "chain": 3},
        )

    # ------------------------------------------------------------------ which items are attacks
    def test_heals_taunts_and_armour_are_not_attacks(self):
        self.assertNotIn("Greydwarf_shaman_heal", self.ids("Greydwarf_Shaman"))
        self.assertNotIn("Fenring_taunt", self.ids("Fenring"))
        self.assertNotIn("GoblinBrute_ArmGuard", self.ids("GoblinBrute"))

    def test_every_attack_hits_or_summons(self):
        empty = [
            (creature, a["id"])
            for creature, entry in self.creatures.items()
            for a in entry["attacks"]
            if not a["hits"] and not a.get("summons")
        ]
        self.assertEqual(empty, [])

    def test_every_hit_deals_damage_and_says_how_it_scales(self):
        for creature, entry in self.creatures.items():
            hits = [h for a in entry["attacks"] for h in a["hits"]] + entry["onDeath"]
            for hit in hits:
                self.assertTrue(hit["damages"] or hit.get("trueDamage"), creature)
                self.assertIn(hit["scaling"], ("attack", "world", "none"), creature)
                self.assertIn(hit["source"], ("weapon", "projectile", "aoe", "impact"), creature)
                if hit["source"] != "weapon":
                    self.assertEqual(hit["staggerMultiplier"], 1, creature)


    # ------------------------------------------------------------------ what the AI can use
    def test_an_attack_the_ai_can_never_aim_is_left_out(self):
        # Barka_Backslam: m_aiAttackMaxAngle 210 with m_aiInvertAngleCheck, and an angle never exceeds 180
        # (BaseAI.IsLookingAt gates MonsterAI's every attack).
        self.assertNotIn("Barka_Backslam", self.ids("Barka"))
        self.assertIn("Barka_HeavySwing", self.ids("Barka"))

    def test_an_attack_that_kills_its_user_says_so(self):
        self.assertIs(self.attack("Writhan", "writhan_explode_aoe")["killsSelf"], True)
        self.assertNotIn("killsSelf", self.attack("Troll", "troll_punch"))

    # ------------------------------------------------------------------ damage outside the attack's hit
    def test_a_thrown_log_hits_on_impact_without_an_owner(self):
        # trollsnow_throw_projectile spawns PineTree_Snow_log_half_frost_troll, whose ImpactEffect deals
        # blunt 50 (and chop) at full speed; HitData has no attacker, blockable and dodgeable stay false.
        impacts = [h for h in self.attack("TrollFrost", "trollsnow_throw")["hits"] if h["source"] == "impact"]
        self.assertEqual(len(impacts), 1)
        self.assertEqual(
            (impacts[0]["damages"], impacts[0]["scaling"], impacts[0]["blockable"], impacts[0]["dodgeable"]),
            ({"blunt": 50}, "none", False, False),
        )

    def test_an_area_spawned_only_on_the_ground_comes_after_a_miss(self):
        # DvergerStaffFire_fireball_projectile has m_groundHitOnly: a direct hit leaves no fire field.
        hits = self.attack("DvergerMage", "DvergerStaffFire_fireball")["hits"]
        self.assertEqual([h.get("afterMiss", False) for h in hits], [False, True])

    def test_a_running_creature_tramples_with_an_area_it_owns(self):
        # Lox: MovementDamage switches RunHitDamager on above 5 m/s; the Aoe is set up with the Lox as owner.
        trample = self.creatures["Lox"]["trample"]
        self.assertEqual(trample["minSpeed"], 5)
        self.assertEqual(
            [(h["damages"], h["scaling"], h["blockable"], h["ticks"]) for h in trample["hits"]],
            [({"blunt": 20}, "world", True, {"every": 4})],
        )
        # The Asksvin carries the same inactive RunHitDamager but no MovementDamage to switch it on.
        self.assertNotIn("trample", self.creatures["Asksvin"])

    def test_a_call_wakes_the_trigger_spawners_of_the_boss_room(self):
        # SeekerQueen_Call fires a TriggerSpawnAbility; each TriggerSpawner_Seeker spawns Seeker or
        # SeekerBrood while fewer than m_maxSpawned (2) of it are around.
        call = self.attack("SeekerQueen", "SeekerQueen_Call")
        self.assertEqual(call["kind"], "summon")
        self.assertEqual({s["id"]: (s["min"], s["max"]) for s in call["summons"]},
                         {"Seeker": (0, 2), "SeekerBrood": (0, 2)})


    # ------------------------------------------------------------------ fixed steps
    def test_burst_timers_run_on_fixed_steps(self):
        # Attack.UpdateProjectile counts m_burstInterval down by Time.fixedDeltaTime (0.0199999929 s, the
        # TimeManager's fixed step) until it reaches 0: 0.1 s takes 6 steps, 0.2 s 11, 1.46 s 74.
        self.assertEqual(self.attack("gd_king", "gd_king_shoot")["hits"][0]["bursts"]["every"], 0.12)
        self.assertEqual(self.attack("BlobTar", "blobtar_attack")["hits"][0]["bursts"]["every"], 0.22)
        self.assertEqual(self.attack("Fenring_Cultist_Hildir", "Fenring_attack_IceNova")["hits"][0]["bursts"]["every"], 1.48)

    def test_area_timers_run_on_fixed_steps_unless_triggered(self):
        # Aoe.CustomFixedUpdate counts m_hitInterval down by fixed steps; with triggers, Update counts it per frame.
        fire = self.attack("DvergerMage", "DvergerStaffFire_fireball")["hits"][1]
        self.assertEqual(fire["ticks"]["every"], 1.02)
        flames = self.attack("Fenring_Cultist", "Fenring_attack_flames")["hits"][0]
        self.assertEqual(flames["ticks"]["every"], 0.5)

    def test_mid_flight_hits_run_on_fixed_steps(self):
        # Projectile.FixedUpdate adds fixed steps until the timer is above m_flightHitInterval (0.5 s): 26 steps.
        bolt = self.attack("JotunWitch", "JotunWitch_attack_lightningbolt")
        self.assertEqual(bolt["hits"][0]["ticks"], {"every": 0.52})

    # ------------------------------------------------------------------ death and what attacks leave
    def test_death_summons_are_kept(self):
        # FrozenKing's death throws FrozenKing_P2_Projectile_Eikthyr, whose SpawnAbility brings Aspect_Eikthyr.
        self.assertEqual([s["id"] for s in self.creatures["FrozenKing"]["deathSummons"]], ["Aspect_Eikthyr"])
        self.assertNotIn("deathSummons", self.creatures["Troll"])

    def test_creatures_dropped_on_death_are_death_summons(self):
        # CharacterDrop instantiates a dropped creature prefab alive: BlobElite drops 2 Blobs (2 x 2^(level-1)),
        # BlobMork 1 BlobMorkMini (Random.Range(1, 2) excludes 2).
        self.assertEqual(self.creatures["BlobElite"]["deathSummons"],
                         [{"id": "Blob", "min": 2, "max": 2, "doublesPerStar": True}])
        self.assertEqual(self.creatures["BlobMork"]["deathSummons"],
                         [{"id": "BlobMorkMini", "min": 1, "max": 1, "doublesPerStar": True}])
        self.assertEqual([s["id"] for s in self.creatures["GoblinBruteBros"]["deathSummons"]], ["GoblinShaman_Hildir"])

    def test_a_pool_left_by_a_projectile_carries_its_status_effect(self):
        # SeekerQueen_projectile_spit creates SeekerQueen_spithit on every hit: an EffectArea that slimes the
        # players standing in it, destroyed after 10.5 s (TimedDestruction).
        spit = self.attack("SeekerQueen", "SeekerQueen_Spit")
        self.assertEqual(spit["leaves"], [{"statusEffect": "Slimed", "duration": 10.5}])
        self.assertNotIn("leaves", self.attack("Troll", "troll_punch"))


if __name__ == "__main__":
    unittest.main()
