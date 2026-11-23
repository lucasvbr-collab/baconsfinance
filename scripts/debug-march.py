import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from importlib.machinery import SourceFileLoader

mod = SourceFileLoader(
    "rbc",
    str(Path(__file__).parent / "rbc-pdf-to-csv.py"),
).load_module()

pdf = Path(r"C:\Users\lucas\Downloads\documents\Chequing Statement-0738 2026-03-23.pdf")
txs = mod.parse_pdf(pdf)
deps = sum(t.amount_signed for t in txs if t.amount_signed > 0)
wds = sum(-t.amount_signed for t in txs if t.amount_signed < 0)
print("count", len(txs))
print("deps", round(deps, 2), "expected 3918.55")
print("wds", round(wds, 2), "expected 2754.64")
for t in txs:
    print(t.date, t.amount_signed, t.description[:60])
