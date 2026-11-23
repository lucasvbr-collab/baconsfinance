import csv
from pathlib import Path

path = Path(r"C:\Users\lucas\Downloads\documents\rbc-chequing-2026-03-08.csv")
deps = wds = march_d = march_w = n = 0
with path.open(encoding="utf-8") as f:
    r = csv.DictReader(f)
    print("fields", r.fieldnames)
    for row in r:
        n += 1
        a = float(row["CAD$"])
        if a >= 0:
            deps += a
        else:
            wds += -a
        if row["Transaction Date"].startswith("2026-03"):
            if a >= 0:
                march_d += a
            else:
                march_w += -a
print("rows", n)
print("all deposits", round(deps, 2), "withdrawals", round(wds, 2))
print("march deposits", round(march_d, 2), "expected 3918.55")
print("march withdraw", round(march_w, 2), "expected 2754.64")
