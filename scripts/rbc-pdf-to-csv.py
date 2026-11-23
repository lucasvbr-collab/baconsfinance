#!/usr/bin/env python3
"""Convert RBC chequing statement PDFs to CSV for Bacon's Finance import."""

from __future__ import annotations

import csv
import re
import sys
from dataclasses import dataclass
from pathlib import Path

import pdfplumber

MONTHS = {
    "Jan": 1,
    "Feb": 2,
    "Mar": 3,
    "Apr": 4,
    "May": 5,
    "Jun": 6,
    "Jul": 7,
    "Aug": 8,
    "Sep": 9,
    "Oct": 10,
    "Nov": 11,
    "Dec": 12,
}

DATE_RE = re.compile(
    r"^(\d{1,2})(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b(.*)$"
)
MONEY_RE = re.compile(r"(\d{1,3}(?:,\d{3})*\.\d{2})")
PERIOD_RE = re.compile(
    r"From\s*([A-Za-z]+)\s*(\d{1,2}),\s*(\d{4})\s*to\s*([A-Za-z]+)\s*(\d{1,2}),\s*(\d{4})",
    re.I,
)
# PDF text often has no spaces: FromMarch2,2026toMarch23,2026
PERIOD_GLUED_RE = re.compile(
    r"From(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"(\d{1,2}),(\d{4})to"
    r"(January|February|March|April|May|June|July|August|September|October|November|December)"
    r"(\d{1,2}),(\d{4})",
    re.I,
)

DEPOSIT_HINTS = (
    "e-transferreceived",
    "transferreceived",
    "deposit",
    "interest",
    "credit",
    "refund",
    "payroll",
    "directdeposit",
)
WITHDRAWAL_HINTS = (
    "purchase",
    "e-transfersent",
    "transfersent",
    "payment",
    "withdrawal",
    "fee",
    "debit",
    "onlinebankingtransfer",
    "billpayment",
    "atm",
)

SKIP_PREFIXES = (
    "openingbalance",
    "closingbalance",
    "date description",
    "detailsofyouraccount",
    "your rbc personal",
    "from",
    "royalbankofcanada",
    "importantinformation",
    "pleasecheck",
    "protectyour",
    "stayinformed",
    "totaldeposits",
    "totalwithdrawals",
    "youropeningbalance",
    "yourclosingbalance",
    "summaryofyouraccount",
    "howtoreachus",
    "c.p.",
    "montreal",
)


@dataclass
class Tx:
    date: str  # YYYY-MM-DD
    description: str
    amount_signed: float  # negative = expense


def money_to_float(s: str) -> float:
    return float(s.replace(",", ""))


def is_deposit(desc: str) -> bool:
    d = re.sub(r"\s+", "", desc).lower()
    for h in DEPOSIT_HINTS:
        if h in d:
            return True
    for h in WITHDRAWAL_HINTS:
        if h in d:
            return False
    # default: treat as withdrawal (safer for spending tracking)
    return False


def extract_period_years(text: str) -> tuple[int, int, int, int]:
    """Return (start_year, start_month, end_year, end_month)."""
    m = PERIOD_RE.search(text.replace("\n", " "))
    if not m:
        m = PERIOD_GLUED_RE.search(re.sub(r"\s+", "", text))
    if not m:
        raise ValueError("Could not find statement period in PDF")
    month_names = {
        "january": 1,
        "february": 2,
        "march": 3,
        "april": 4,
        "may": 5,
        "june": 6,
        "july": 7,
        "august": 8,
        "september": 9,
        "october": 10,
        "november": 11,
        "december": 12,
    }
    sm = month_names[m.group(1).lower()]
    sy = int(m.group(3))
    em = month_names[m.group(4).lower()]
    ey = int(m.group(6))
    return sy, sm, ey, em


def resolve_year(day: int, month: int, sy: int, sm: int, ey: int, em: int) -> int:
    # Statements can span Dec→Jan
    if sy == ey:
        return sy
    if month == sm and (sm > em or sm == 12):
        return sy
    if month == em:
        return ey
    if month >= sm:
        return sy
    return ey


def should_skip(line: str) -> bool:
    low = re.sub(r"\s+", "", line).lower()
    if not low:
        return True
    for p in SKIP_PREFIXES:
        if low.startswith(p.replace(" ", "")) or low.startswith(p):
            # allow From only as period header skip when it's the period line
            if p == "from" and ("to" in low and re.search(r"\d{4}", low)):
                return True
            if p != "from":
                return True
    if re.match(r"^\d+of\d+$", low):
        return True
    if re.match(r"^\d{4,}$", low):  # page junk like 76011 / 86011
        return True
    if low.startswith("*") or low.startswith("-"):
        return True
    return False


def clean_desc(desc: str) -> str:
    desc = re.sub(r"\b\d{5,}\b", " ", desc)  # stray page numbers
    desc = re.sub(r"\s+", " ", desc).strip()
    return desc or "Sem descrição"


def parse_pdf(path: Path) -> list[Tx]:
    with pdfplumber.open(path) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages)

    sy, sm, ey, em = extract_period_years(text)

    # Keep only activity section
    start = text.find("Detailsofyouraccountactivity")
    if start < 0:
        start = text.lower().find("details of your account activity")
    body = text[start:] if start >= 0 else text
    end = body.find("Importantinformationaboutyouraccount")
    if end < 0:
        end = body.lower().find("important information about your account")
    if end > 0:
        body = body[:end]

    lines = [ln.strip() for ln in body.splitlines() if ln.strip()]
    txs: list[Tx] = []
    current_date: tuple[int, int, int] | None = None  # y, m, d
    buf_desc: list[str] = []

    def flush(amounts: list[float]):
        nonlocal buf_desc
        if not current_date or not buf_desc or not amounts:
            buf_desc = []
            return
        desc = " ".join(buf_desc)
        desc = re.sub(r"\s+", " ", desc).strip()
        # strip trailing money strings already captured
        desc = MONEY_RE.sub("", desc).strip()
        desc = re.sub(r"\s+", " ", desc).strip()
        desc = clean_desc(desc)

        if len(amounts) >= 2:
            txn_amt = amounts[0]
        else:
            txn_amt = amounts[0]

        signed = abs(txn_amt) if is_deposit(desc) else -abs(txn_amt)
        y, m, d = current_date
        txs.append(
            Tx(
                date=f"{y:04d}-{m:02d}-{d:02d}",
                description=desc,
                amount_signed=signed,
            )
        )
        buf_desc = []

    for line in lines:
        if should_skip(line):
            continue
        if re.match(r"^ClosingBalance", line, re.I):
            break

        m = DATE_RE.match(line)
        if m:
            # flush previous incomplete? keep going — date starts new group
            day = int(m.group(1))
            mon = MONTHS[m.group(2)]
            year = resolve_year(day, mon, sy, sm, ey, em)
            rest = m.group(3).strip()
            current_date = (year, mon, day)
            # If previous buffer had content without amounts, drop orphan
            buf_desc = []
            if rest:
                amounts = [money_to_float(x) for x in MONEY_RE.findall(rest)]
                # description without amounts
                desc_part = MONEY_RE.sub("", rest).strip()
                if desc_part:
                    buf_desc.append(desc_part)
                if amounts:
                    flush(amounts)
            continue

        # continuation line
        if current_date is None:
            continue
        if re.match(r"^\d{4,}$", line.strip()):
            continue
        amounts = [money_to_float(x) for x in MONEY_RE.findall(line)]
        desc_part = MONEY_RE.sub("", line).strip()
        if desc_part and not re.match(r"^\d{4,}$", desc_part):
            buf_desc.append(desc_part)
        if amounts:
            flush(amounts)

    return txs


def write_csv(txs: list[Tx], out: Path) -> None:
    # Dedup exact duplicates across overlapping statements
    seen: set[tuple[str, str, float]] = set()
    unique: list[Tx] = []
    for t in txs:
        key = (t.date, t.description, round(t.amount_signed, 2))
        if key in seen:
            continue
        seen.add(key)
        unique.append(t)

    unique.sort(key=lambda t: (t.date, t.description))
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["Transaction Date", "Description 1", "CAD$"])
        for t in unique:
            w.writerow([t.date, t.description, f"{t.amount_signed:.2f}"])
    print(f"Wrote {len(unique)} transactions -> {out}")


def main() -> int:
    folder = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\lucas\Downloads\documents")
    out = Path(
        sys.argv[2]
        if len(sys.argv) > 2
        else folder / "rbc-chequing-2026-03-08.csv"
    )
    pdfs = sorted(folder.glob("Chequing Statement*.pdf"))
    if not pdfs:
        print("No PDFs found", file=sys.stderr)
        return 1

    all_txs: list[Tx] = []
    for pdf in pdfs:
        txs = parse_pdf(pdf)
        print(f"{pdf.name}: {len(txs)} txs")
        all_txs.extend(txs)

    write_csv(all_txs, out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
