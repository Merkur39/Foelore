"""Rebuild every theme page from Origine and lay out the canvas index of all pages.

Réglages screens draw their colours from their own palette table: they are copied, not recoloured,
and open on the page's theme. Pages made by hand (the archived "sim" page, the app icon) are left
untouched.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from palettes import TITLE, VARIANTS, recolour  # noqa: E402

PROJECT = Path(sys.argv[1])
SELF_THEMED = {"Reglages.dc.html", "Desktop-Reglages.dc.html"}
LINK = re.compile(r'href="([A-Za-z][A-Za-z-]*)\.dc\.html"')
DEFAULT_THEME = "this.state = { theme: 'origine', lang: 'auto' };"
LIGHT_THEMES = {"jour", "parchemin"}
DARK_SCHEME = ":root{color-scheme:dark}"

M_W, M_H, M_GAP, M_ROW = 390, 844, 80, 1264
D_W, D_H, D_GAP, D_ROW, D_TOP = 1440, 900, 80, 1320, 10352
NOTE_ABOVE = 300

# (row title, [(file, board title, interactive)]) — one canvas row each.
MOBILE = [
    ("Bestiaire", [("Bestiaire", "Bestiaire", True), ("Bestiaire-Recherche", "Bestiaire · recherche", True),
                   ("Monstre", "Fiche monstre", True)]),
    ("Simulation", [("Main", "Simulation", True), ("Attaque", "Choisir une attaque", False),
                    ("Recherche", "Choisir une attaque · recherche", False)]),
    ("Arsenal et mémo", [("Arsenal", "Arsenal", True), ("Arsenal-Recherche", "Arsenal · recherche", True),
                         ("Memo", "Mémo", True)]),
    ("Ton équipement", [("Profil", "Ton équipement", False), ("Equipement-Tenu", "Ton équipement · ce que tu tiens", False),
                        ("Equipement-Cape", "Ton équipement · ta cape", False),
                        ("Equipement-Bibelot", "Ton équipement · ton bibelot", False),
                        ("Equipement-Boisson", "Ton équipement · une boisson de plus", False),
                        ("Equipement-Barriere", "Ton équipement · la barrière magique", True)]),
    ("Fenêtres et système", [("Monde", "Ton monde", False),
                             ("Contexte", "Ton contexte", True), ("Reglages", "Réglages", True),
                             ("Mentions", "Mentions et crédits", False), ("Tokens", None, False)]),
    ("Tes retours", [("Signaler", "Signaler", True), ("Signalements", "Mes signalements", False),
                     ("Nouveautes", "Nouveautés", False), ("Merci", "Corrigé grâce à toi", True)]),
    ("Plantages", [("Plantee", "Fiche plantée", True), ("Ligne-Plantee", "Ligne plantée · Bestiaire", True),
                   ("Arsenal-Ligne-Plantee", "Ligne plantée · Arsenal", True),
                   ("Simulation-Plantee", "Simulation plantée", True), ("Secours", "Foelore a planté", True)]),
    ("Première arrivée", [("Installer", "Installer l'app", True), ("Installer-Safari", "Installer l'app · Safari", True),
                          ("Arrivee-Biome", "Première arrivée · 1 · biome", True),
                          ("Arrivee-Equipement", "Première arrivée · 2 · équipement", True),
                          ("Arrivee-Casque", "Première arrivée · 2 · ton casque", False),
                          ("Arrivee-Monde", "Première arrivée · 3 · monde", True)]),
]
DESKTOP = [
    ("Desktop · écrans principaux", [("Bestiaire", "Bestiaire", True), ("Bestiaire-Recherche", "Bestiaire · recherche", True),
                                     ("Combat", "Simulation", True)]),
    ("Desktop · arsenal et mémo", [("Arsenal", "Arsenal", True), ("Arsenal-Recherche", "Arsenal · recherche", True),
                                   ("Memo", "Mémo", False)]),
    ("Desktop · ton équipement", [("Equipement", "Ton équipement", False),
                                  ("Equipement-Tenu", "Ton équipement · ce que tu tiens", False),
                                  ("Equipement-Cape", "Ton équipement · ta cape", False),
                                  ("Equipement-Bibelot", "Ton équipement · ton bibelot", False),
                                  ("Equipement-Boisson", "Ton équipement · une boisson de plus", False),
                                  ("Equipement-Barriere", "Ton équipement · la barrière magique", True)]),
    ("Desktop · fenêtres", [("Attaque", "Choisir une attaque", True), ("Recherche", "Choisir une attaque · recherche", False),
                            ("Monde", "Ton monde", False), ("Reglages", "Réglages", True),
                            ("Mentions", "Mentions et crédits", False)]),
    ("Desktop · tes retours", [("Signaler", "Signaler", True), ("Signalements", "Mes signalements", False),
                               ("Nouveautes", "Nouveautés", False), ("Merci", "Corrigé grâce à toi", True)]),
    ("Desktop · plantages", [("Plantee", "Fiche plantée", True), ("Ligne-Plantee", "Ligne plantée · Bestiaire", True),
                             ("Arsenal-Ligne-Plantee", "Ligne plantée · Arsenal", True),
                             ("Simulation-Plantee", "Simulation plantée", True),
                             ("Secours", "Foelore a planté", True)]),
    ("Desktop · première arrivée", [("Installer", "Installer l'app", True),
                                    ("Arrivee-Biome", "Première arrivée · 1 · biome", True),
                                    ("Arrivee-Equipement", "Première arrivée · 2 · équipement", True),
                                    ("Arrivee-Casque", "Première arrivée · 2 · ton casque", False),
                                    ("Arrivee-Monde", "Première arrivée · 3 · monde", True)]),
]
TOKENS_W, TOKENS_H = 880, 960


def derive(source, v, vid):
    text = (PROJECT / source).read_text(encoding="utf-8")
    if source in SELF_THEMED:
        if text.count(DEFAULT_THEME) != 1:
            raise SystemExit(f"{source}: default theme line not found")
        text = text.replace(DEFAULT_THEME, f"this.state = {{ theme: '{vid}', lang: 'auto' }};")
    else:
        text = recolour(text, v)
        if vid in LIGHT_THEMES:
            text = text.replace(DARK_SCHEME, ":root{color-scheme:light}")
    text = LINK.sub(lambda m: f'href="{v["prefix"]}-{m.group(1)}.dc.html"', text)
    return TITLE.sub(lambda m: f"<title>{m.group(1)} · {v['name']}</title>", text, count=1)


def layout(page, prefix, tokens_title):
    """Boards and notes of one page; page None is Origine (the default page carries no page key)."""
    boards, notes = {}, {}
    tag = {} if page is None else {"page": page}
    suffix = "" if page is None else f"-{page}"

    for r, (row_title, items) in enumerate(MOBILE):
        y, x = r * M_ROW, 0
        for file, title, interactive in items:
            w = TOKENS_W if file == "Tokens" else M_W
            entry = {"x": x, "y": y, "w": w, "h": TOKENS_H if file == "Tokens" else M_H, "title": title or tokens_title, **tag}
            if interactive:
                entry["is_interactive"] = True
            boards[f"{prefix}{file}.dc.html"] = entry
            x += w + M_GAP
        notes[f"m-row{r + 1}{suffix}"] = {"kind": "title1", "text": row_title, "x": 0, "y": y - NOTE_ABOVE, "maxW": x - M_GAP, **tag}

    for r, (row_title, items) in enumerate(DESKTOP):
        y, x = D_TOP + r * D_ROW, 0
        for file, title, interactive in items:
            entry = {"x": x, "y": y, "w": D_W, "h": D_H, "title": title + " · desktop", "expand": "fill", **tag}
            if interactive:
                entry["is_interactive"] = True
            boards[f"{prefix}Desktop-{file}.dc.html"] = entry
            x += D_W + D_GAP
        notes[f"d-row{r + 1}{suffix}"] = {"kind": "title1", "text": row_title, "x": 0, "y": y - NOTE_ABOVE, "maxW": x - D_GAP, **tag}
    return boards, notes


def main():
    index_path = PROJECT / "canvas.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    written = 0
    mobile_files = [f for _, items in MOBILE for f, _, _ in items]
    desktop_files = [f"Desktop-{f}" for _, items in DESKTOP for f, _, _ in items]

    for vid, v in VARIANTS.items():
        for b in mobile_files + desktop_files:
            source = f"{b}.dc.html"
            (PROJECT / f"{v['prefix']}-{source}").write_text(derive(source, v, vid), encoding="utf-8", newline="\n")
            written += 1

    by_hand = lambda entry: "page" in entry and entry["page"] not in VARIANTS  # noqa: E731
    archived = {k: b for k, b in index["boards"].items() if by_hand(b)}
    archived_notes = {k: n for k, n in index["notes"].items() if by_hand(n)}
    boards, notes = layout(None, "", index["boards"]["Tokens.dc.html"]["title"])
    for vid, v in VARIANTS.items():
        b, n = layout(vid, v["prefix"] + "-", v["tokens"])
        boards.update(b)
        notes.update(n)
    missing = [k for k in boards if not (PROJECT / k).exists()]
    if missing:
        raise SystemExit(f"missing files: {missing}")
    origin = [k for k in boards if "page" not in boards[k]]
    themed = [k for k in boards if "page" in boards[k]]
    index["boards"] = {**{k: boards[k] for k in origin}, **archived, **{k: boards[k] for k in themed}}
    index["notes"] = {**{k: n for k, n in notes.items() if "page" not in n}, **archived_notes,
                      **{k: n for k, n in notes.items() if "page" in n}}
    index["order"] = list(index["boards"])

    index_path.write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(written, "files written,", len(index["boards"]), "boards,", len(index["notes"]), "notes")


main()
