# pipeline/fix_seeds.py
import json

fixes = {
    "SEED-ctx_alias-001": {"entities": {"commodity_raw": "chana", "commodity_canonical": "Chickpea"}},
    "SEED-ctx_alias-002": {"entities": {"commodity_raw": "sarso", "commodity_canonical": "Mustard"}},
    "SEED-ctx_alias-003": {"entities": {"commodity_raw": "gehun", "commodity_canonical": "Wheat"}},
    "SEED-ctx_alias-004": {"entities": {"commodity_raw": "pyaz", "commodity_canonical": "Onion"}},
    "SEED-ctx_alias-005": {"entities": {"commodity_raw": "kapas", "commodity_canonical": "Cotton"}},
    "SEED-ctx_alias-006": {"entities": {"commodity_raw": "soyabean", "commodity_canonical": "Soybean"}},
    "SEED-ctx_alias-007": {"entities": {"commodity_raw": "moong", "commodity_canonical": "Mung Bean"}},
}

simple_ids = {
    "SEED-inv_add-001","SEED-inv_add-004","SEED-inv_add-007",
    "SEED-inv_sub-001","SEED-inv_sub-005","SEED-inv_sub-007",
    "SEED-inv_set-003","SEED-inv_set-007",
    "SEED-inv_qry-001","SEED-inv_qry-004","SEED-inv_qry-006",
    "SEED-inv_val-002","SEED-inv_val-003","SEED-inv_val-004","SEED-inv_val-006",
    "SEED-mkt_prc-006",
    "SEED-dsp_crt-001","SEED-dsp_crt-004","SEED-dsp_crt-005",
    "SEED-dsp_crt-006","SEED-dsp_crt-007",
    "SEED-dsp_rte-001","SEED-dsp_rte-002","SEED-dsp_rte-004",
    "SEED-dsp_rte-005","SEED-dsp_rte-006","SEED-dsp_rte-007",
    "SEED-dsp_dly-001","SEED-dsp_dly-003","SEED-dsp_dly-005",
    "SEED-rsk_port-001","SEED-rsk_port-002","SEED-rsk_port-003","SEED-rsk_port-006",
    "SEED-rsk_pnl-001","SEED-rsk_pnl-002","SEED-rsk_pnl-004",
    "SEED-rsk_alrt-001","SEED-rsk_alrt-003","SEED-rsk_alrt-004",
    "SEED-rsk_alrt-005","SEED-rsk_alrt-007",
    "SEED-rsk_cpty-001","SEED-rsk_cpty-002","SEED-rsk_cpty-004",
    "SEED-rsk_cpty-005","SEED-rsk_cpty-006","SEED-rsk_cpty-007",
    "SEED-byr_find-001","SEED-byr_find-005","SEED-byr_find-007",
    "SEED-byr_prof-001","SEED-byr_prof-002","SEED-byr_prof-004",
    "SEED-byr_prof-005","SEED-byr_prof-007",
    "SEED-cmp_inv-001","SEED-cmp_inv-002","SEED-cmp_inv-003",
    "SEED-cmp_inv-004","SEED-cmp_inv-005","SEED-cmp_inv-006","SEED-cmp_inv-007",
    "SEED-cmp_gst-001","SEED-cmp_gst-002","SEED-cmp_gst-003",
    "SEED-cmp_gst-004","SEED-cmp_gst-006","SEED-cmp_gst-007",
    "SEED-dl_nego-002","SEED-dl_nego-006",
}

rows = []
with open("pipeline/output/intent_seeds_english.jsonl") as f:
    for line in f:
        row = json.loads(line.strip())
        if row["id"] in fixes:
            row["entities"].update(fixes[row["id"]]["entities"])
            row["is_ambiguous"] = False
        if row["id"] in simple_ids:
            row["difficulty"] = "simple"
            row["is_ambiguous"] = False
        rows.append(row)

with open("pipeline/output/intent_seeds_english.jsonl", "w") as f:
    for row in rows:
        f.write(json.dumps(row) + "\n")

# Regenerate CSV
import csv
csv_rows = []
for row in rows:
    csv_rows.append({
        "id": row["id"],
        "utterance": row["utterance"],
        "utterance_language": row["utterance_language"],
        "intent": row["intent"],
        "intent_category": row["intent_category"],
        "agent": row["action"]["agent"],
        "commodity_canonical": row["entities"].get("commodity_canonical",""),
        "quantity": row["entities"].get("quantity",""),
        "unit": row["entities"].get("unit",""),
        "counterparty": row["entities"].get("counterparty",""),
        "location": row["entities"].get("location",""),
        "requires_context": row["requires_context"],
        "difficulty": row["difficulty"],
        "source": row["source"],
    })

with open("pipeline/output/intent_seeds_for_adaption.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=csv_rows[0].keys())
    writer.writeheader()
    writer.writerows(csv_rows)

print(f"Fixed {len(rows)} rows. Saved corrected files.")