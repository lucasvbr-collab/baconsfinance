"""Build compact VALUES inserts using known category UUIDs + AI assignments from CSV."""

from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import urllib.request
from pathlib import Path

HOUSEHOLD_ID = "540be4e2-0c0c-4b43-a178-74df6ee912a2"
USER_ID = "b7512df9-b111-40cd-946e-b6971bf467db"

CAT = {
    "Combustível": "af75cdcb-49ad-4193-952a-72c087c0be20",
    "Compras": "0b844276-81cd-446c-b9e5-083871a5c8b8",
    "Mercado": "7cbb448a-69f9-45d8-903e-83881c48ced0",
    "Moradia": "c3b6eb30-52ce-4784-8a28-cabfb409fb1c",
    "Outros": "653b19b2-893b-4016-a02c-3e7b5119172e",
    "Pets": "dece8765-1a92-46e3-baaa-b07b765abcdf",
    "Restaurante": "b7b7e911-cc64-4884-a63d-9384c50f55b8",
    "Salário": "a8273342-9a40-4382-85c5-847629e29437",
    "Saúde": "11400624-09e3-45eb-9232-1a147d168b85",
    "Serviços": "ffaa297c-d51c-4d3b-a135-124407cbeb95",
    "Transferências": "457b36e4-23ff-408b-ae8d-083ba81915b6",
    "Transporte": "82622aba-38fe-4291-bc61-802614638aa0",
}


def load_env():
    env = Path(__file__).resolve().parents[1] / ".env.local"
    if not env.exists():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        t = line.strip()
        if not t or t.startswith("#") or "=" not in t:
            continue
        k, v = t.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def sql_str(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def import_hash(day: str, amount: float, description: str, typ: str) -> str:
    raw = f"csv|{day}|{amount:.2f}|{description}|{typ}"
    return hashlib.sha256(raw.encode()).hexdigest()


def openai_categorize(items: list[dict], categories: list[str]) -> dict[int, str]:
    # Reuse previous meta if available
    cache = Path(__file__).resolve().parent / "out" / "assignments.json"
    if cache.exists():
        return {int(k): v for k, v in json.loads(cache.read_text(encoding="utf-8")).items()}

    api_key = os.environ.get("OPENAI_API_KEY")
    result: dict[int, str] = {}
    if not api_key:
        return result
    batch_size = 40
    for start in range(0, len(items), batch_size):
        batch = items[start : start + batch_size]
        body = {
            "model": "gpt-4o-mini",
            "response_format": {"type": "json_object"},
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You categorize Canadian bank transactions. "
                        f"Available categories (use EXACTLY one): {', '.join(categories)}. "
                        'Respond ONLY JSON: {"assignments":[{"index":number,"category":string}]}.'
                    ),
                },
                {"role": "user", "content": json.dumps(batch)},
            ],
            "max_tokens": 2000,
        }
        req = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body).encode(),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
        raw = data["choices"][0]["message"]["content"]
        parsed = json.loads(raw)
        lower = {c.lower(): c for c in categories}
        for a in parsed.get("assignments", []):
            idx = a.get("index")
            cat = a.get("category")
            if isinstance(idx, int) and isinstance(cat, str) and cat.lower() in lower:
                result[idx] = lower[cat.lower()]
        print(f"AI {start}-{start+len(batch)}")
    cache.write_text(json.dumps({str(k): v for k, v in result.items()}), encoding="utf-8")
    return result


def main():
    load_env()
    out = Path(__file__).resolve().parent / "out"
    out.mkdir(exist_ok=True)
    csv_path = Path(r"C:\Users\lucas\Downloads\documents\rbc-chequing-2026-03-08.csv")

    rows = []
    with csv_path.open(encoding="utf-8") as f:
        for row in csv.DictReader(f):
            day = row["Transaction Date"].strip()
            signed = float(row["CAD$"])
            if signed == 0:
                continue
            desc = (row.get("Description 1") or "Sem descrição").strip()
            typ = "expense" if signed < 0 else "income"
            amount = abs(signed)
            rows.append(
                {
                    "day": day,
                    "date_iso": f"{day}T12:00:00+00:00",
                    "description": desc,
                    "amount": amount,
                    "type": typ,
                    "import_hash": import_hash(day, amount, desc, typ),
                }
            )

    # Prefer assignments already done by prepare-import-sql if we rebuild from SQL names
    # Re-run AI only if no cache: extract from previous insert SQL category names
    assignments_path = out / "assignments.json"
    if not assignments_path.exists():
        # Parse category from previous insert SQL files
        assign: dict[int, str] = {}
        # Fall back: re-call AI
        assign = openai_categorize(
            [
                {"index": i, "description": r["description"], "type": r["type"]}
                for i, r in enumerate(rows)
            ],
            list(CAT.keys()),
        )
    else:
        assign = {int(k): v for k, v in json.loads(assignments_path.read_text(encoding="utf-8")).items()}

    if not assign:
        # Recover from old SQL files
        assign = {}
        idx = 0
        for fp in sorted(out.glob("02_insert_*.sql")):
            text = fp.read_text(encoding="utf-8")
            cats = re.findall(r"lower\('([^']+)'\)", text)
            for cat in cats:
                assign[idx] = cat
                idx += 1
        assignments_path.write_text(
            json.dumps({str(k): v for k, v in assign.items()}, ensure_ascii=False),
            encoding="utf-8",
        )
        print(f"Recovered {len(assign)} assignments from old SQL")

    values = []
    for i, r in enumerate(rows):
        cat_name = assign.get(i, "Outros")
        cat_id = CAT.get(cat_name, CAT["Outros"])
        merchant = re.sub(r"\s+", " ", r["description"]).strip()[:200]
        values.append(
            "("
            f"{sql_str(HOUSEHOLD_ID)}::uuid,"
            f"{sql_str(USER_ID)}::uuid,"
            f"{sql_str(r['description'])},"
            f"{r['amount']:.2f},"
            f"{sql_str(r['date_iso'])}::timestamptz,"
            f"{sql_str(cat_id)}::uuid,"
            f"{sql_str(r['type'])},"
            f"'csv',"
            f"'pending_review',"
            f"{sql_str(merchant)},"
            f"{sql_str(r['import_hash'])}"
            ")"
        )

    # Chunk of 25 rows per statement (~8-12KB)
    chunk = 25
    files = []
    for i in range(0, len(values), chunk):
        part = values[i : i + chunk]
        sql = (
            "insert into transactions_baconsfinance (\n"
            "  household_id, user_id, description, amount, date, category_id, type,\n"
            "  source, status, merchant_name, import_hash\n"
            ") values\n"
            + ",\n".join(part)
            + "\non conflict do nothing;\n"
        )
        # unique index on (household_id, import_hash) - ON CONFLICT needs constraint name
        # Our unique index is transactions_bf_import_hash_uidx on (household_id, import_hash)
        sql = sql.replace(
            "on conflict do nothing;",
            "on conflict (household_id, import_hash) do nothing;",
        )
        # Wait - unique index might not create a constraint usable by ON CONFLICT unless it's a constraint.
        # Partial/unique INDEX works in PG for ON CONFLICT if columns match.
        fp = out / f"v_{i // chunk:03d}.sql"
        fp.write_text(sql, encoding="utf-8")
        files.append(fp)
        print(fp.name, len(sql))

    print("files", len(files), "rows", len(values))


if __name__ == "__main__":
    main()
