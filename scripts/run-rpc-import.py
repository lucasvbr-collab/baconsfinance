"""Import via RPC import_csv_batch_bf using anon key + one-shot secret."""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

HOUSEHOLD_ID = "540be4e2-0c0c-4b43-a178-74df6ee912a2"
USER_ID = "b7512df9-b111-40cd-946e-b6971bf467db"
SECRET = "bf_import_one_shot_2026"

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
    for line in env.read_text(encoding="utf-8").splitlines():
        t = line.strip()
        if not t or t.startswith("#") or "=" not in t:
            continue
        k, v = t.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def main():
    load_env()
    url = os.environ["NEXT_PUBLIC_SUPABASE_URL"].rstrip("/")
    key = os.environ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
    out = Path(__file__).resolve().parent / "out"
    assign = {
        int(k): v
        for k, v in json.loads((out / "assignments.json").read_text(encoding="utf-8")).items()
    }

    import csv
    import hashlib
    import re

    def ih(day, amount, description, typ):
        raw = f"csv|{day}|{amount:.2f}|{description}|{typ}"
        return hashlib.sha256(raw.encode()).hexdigest()

    rows = []
    csv_path = Path(r"C:\Users\lucas\Downloads\documents\rbc-chequing-2026-03-08.csv")
    with csv_path.open(encoding="utf-8") as f:
        for i, row in enumerate(csv.DictReader(f)):
            day = row["Transaction Date"].strip()
            signed = float(row["CAD$"])
            if signed == 0:
                continue
            desc = (row.get("Description 1") or "Sem descrição").strip()
            typ = "expense" if signed < 0 else "income"
            amount = abs(signed)
            cat = assign.get(i, "Outros")
            rows.append(
                {
                    "household_id": HOUSEHOLD_ID,
                    "user_id": USER_ID,
                    "description": desc,
                    "amount": amount,
                    "date": f"{day}T12:00:00+00:00",
                    "category_id": CAT.get(cat, CAT["Outros"]),
                    "type": typ,
                    "source": "csv",
                    "status": "pending_review",
                    "merchant_name": re.sub(r"\s+", " ", desc).strip()[:200],
                    "import_hash": ih(day, amount, desc, typ),
                }
            )

    print(f"Importing {len(rows)} rows via RPC…")
    total = 0
    chunk = 50
    for i in range(0, len(rows), chunk):
        batch = rows[i : i + chunk]
        body = json.dumps(
            {"p_rows": batch, "p_secret": SECRET}
        ).encode()
        req = urllib.request.Request(
            f"{url}/rest/v1/rpc/import_csv_batch_bf",
            data=body,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                n = json.loads(resp.read().decode())
            total += int(n) if n is not None else len(batch)
            print(f"batch {i}-{i+len(batch)}: rpc returned {n}")
        except urllib.error.HTTPError as e:
            err = e.read().decode()
            print("HTTP error", e.code, err)
            raise

    print("done, processed batches totaling", total)


if __name__ == "__main__":
    main()
