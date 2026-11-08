"""Contrôle référentiel MRS6 / Bouc-Bel-Air et des 5 onglets.
Exécution : python validate.py depuis la racine du dépôt.
Ne prétend pas vérifier le rendu du navigateur ni le contenu des liens externes.
"""
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent

def load(path):
    return json.loads((ROOT / path).read_text(encoding="utf-8"))

actors = load("data/actors.json")
claims = load("data/claims.json")
relations = load("data/relations.json")
evidence = load("data/evidence.json")
sources = load("data/sources.json")
timeline = load("data/timeline.json")
content = load("data/content.json")
taxonomy = load("config/taxonomy.json")
meta = load("data/meta.json")

def indexed(label, values):
    ids = {value["id"] for value in values}
    assert len(ids) == len(values), f"Identifiants dupliqués : {label}"
    return {value["id"]: value for value in values}

A = indexed("actors", actors)
C = indexed("claims", claims)
R = indexed("relations", relations)
E = indexed("evidence", evidence)
S = indexed("sources", sources)
T = indexed("timeline", timeline)

assert meta["id"] in A
for actor in actors:
    assert set(actor["categories"]) <= set(taxonomy["categories"]), actor["id"]
for item in claims:
    assert item["subject_id"] in A, item["id"]
    assert item["value"] in taxonomy["stances"], item["id"]
    assert set(item.get("evidence_ids", [])) <= E.keys(), item["id"]
for item in relations:
    assert item["source_id"] in A and item["target_id"] in A, item["id"]
    assert item["type"] in taxonomy["relation_types"], item["id"]
    assert set(item.get("evidence_ids", [])) <= E.keys(), item["id"]
for item in evidence:
    if item.get("source_id"):
        assert item["source_id"] in S, item["id"]
    if item["id"].startswith("evidence_bouc_20261108_"):
        src = S[item["source_id"]]
        url = urlsplit(src["url"])
        assert url.scheme == "https" and url.netloc, item["id"]

config = taxonomy["timeline"]
allowed_categories = {item["id"] for item in config["categories"]}
counted_actors = set()
for event in timeline:
    assert event["actor_id"] in A, event["id"]
    assert event["actor_id"] not in counted_actors, f"Double comptage : {event['actor_id']}"
    counted_actors.add(event["actor_id"])
    assert event["event_type"] == config["event_type"], event["id"]
    assert event["category"] in allowed_categories, event["id"]
    assert set(event.get("source_ids", [])) <= S.keys(), event["id"]
    assert event["source_ids"], event["id"]
    assert set(event.get("evidence_ids", [])) <= E.keys(), event["id"]
    assert all(S[s]["url"] for s in event["source_ids"]), event["id"]
    if event["status"] == "confirmed":
        assert event["date_precision"] == "day", event["id"]
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}", event["date"]), event["id"]
        assert date.fromisoformat(event["date"]) <= date(2026, 11, 8), event["id"]
        assert event.get("evidence_ids"), event["id"]
    else:
        assert event["status"] == "undated" and event["date"] is None, event["id"]

for section in ("milestones", "fact_sheet"):
    assert content.get(section), f"Section vide : {section}"
    for item in content[section]:
        assert set(item.get("evidence_ids", [])) <= E.keys(), item["id"]
        assert item.get("evidence_ids"), item["id"]
        for eid in item["evidence_ids"]:
            ev = E[eid]
            assert ev.get("source_id") in S and S[ev["source_id"]].get("url"), item["id"]
    if section == "milestones":
        assert len({item["id"] for item in content[section]}) == len(content[section]), "Jalons dupliqués"
        for item in content[section]:
            precision = item.get("period_precision")
            if precision == "day":
                date.fromisoformat(item["date"])
            else:
                assert precision == "year" and re.fullmatch(r"\d{4}", item["date"]), item["id"]
            assert item["status"] in ("documented", "reported", "forecast"), item["id"]

html = (ROOT / "apps/cards/index.html").read_text(encoding="utf-8")
for tab in ("carto", "griefs", "vigilance", "evolution", "chronology"):
    assert f'data-tab="{tab}"' in html, tab
    assert f'id="tab-{tab}"' in html, tab
for script in ("assets/js/evolution.js", "assets/css/evolution.css", "assets/css/chronology.css"):
    assert (ROOT / script).is_file(), script

dated = sum(e["status"] == "confirmed" for e in timeline)
undated = sum(e["status"] == "undated" for e in timeline)
assert dated + undated == len(actors) - 1, "Un acteur doit être daté ou mis en vigilance"
print(
    f"VALIDATION OK : {len(actors)} entités dont {len(actors)-1} acteurs, "
    f"{len(claims)} positions, {len(relations)} relations, {len(evidence)} preuves, "
    f"{len(sources)} références ({sum(bool(s.get('url')) for s in sources)} avec URL), "
    f"{len(content['milestones'])} jalons, {len(content['fact_sheet'])} repères, "
    f"{dated} acteurs datés, {undated} à qualifier et 5 onglets."
)
