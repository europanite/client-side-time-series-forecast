#!/usr/bin/env python3
"""Fetch a multi-target Japanese equities panel and macro factors for offline selection.

Do not treat revised Yahoo bars as an as-of point-in-time historical archive.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import math
import os
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

REPO_ROOT = Path(__file__).resolve().parent.parent


def write_if_changed(path: Path, content: bytes) -> bool:
    """Atomically replace a snapshot only when its contents differ."""
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_bytes() == content:
        return False
    temp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        temp.write_bytes(content)
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)
    return True

# Each sector has multiple possible prediction *targets*. No symbol is privileged.
SECTORS = {
    "automakers": ["7203.T", "7267.T", "7270.T"],
    "banks": ["8306.T", "8316.T", "8411.T"],
    "electronics": ["6758.T", "6501.T", "6702.T"],
    "telecom": ["9432.T", "9433.T"],
    "trading_houses": ["8058.T", "8031.T"],
}
MACRO = ["^N225", "^TOPX", "JPY=X", "^GSPC", "CL=F"]
FOREIGN = {"JPY=X", "^GSPC", "CL=F"}


def prices_from_history(history, cutoff: date):
    if history is None or history.empty or not {"Open", "Close"}.issubset(history.columns):
        raise ValueError("Missing Open or Close bars")
    prices = {}
    for timestamp, bar in history.iterrows():
        day = timestamp.date() if hasattr(timestamp, "date") else date.fromisoformat(str(timestamp)[:10])
        if day > cutoff:
            continue
        op, cl = float(bar["Open"]), float(bar["Close"])
        if math.isfinite(op) and op > 0 and math.isfinite(cl) and cl > 0:
            prices[day.isoformat()] = (op, cl)
    if not prices:
        raise ValueError("No valid daily bars")
    return prices


def csv_bytes(header, records):
    stream = io.StringIO(newline="")
    writer = csv.writer(stream, lineterminator="\n")
    writer.writerow(header)
    writer.writerows(records)
    return stream.getvalue().encode("utf-8")


def build_panel(prices, sectors, min_bars=260):
    candidates = [symbol for members in sectors.values() for symbol in members if symbol in prices]
    if not candidates:
        raise ValueError("No available Japanese equity targets")
    # Select the densest local equity solely for the reference trading calendar.
    anchor = max(candidates, key=lambda sym: len(prices[sym]))
    dates = sorted(prices[anchor])
    targets = [sym for sym in candidates if len(set(dates) & prices[sym].keys()) >= 0.985 * len(dates)]
    if len(targets) < 2:
        raise ValueError("Too few targets with compatible Japanese trading calendars")
    # Do not fabricate missing target observations: only use complete target sessions.
    days = [day for day in dates if all(day in prices[sym] for sym in targets)]
    if len(days) < min_bars:
        raise ValueError(f"Only {len(days)} aligned target sessions; require {min_bars}")
    factors = sorted(sym for sym in prices if sym not in targets)
    columns = [*targets, *factors]
    panel = csv_bytes(["Date", *columns], [
        [day, *[f"{prices[sym][day][1]:.10g}" if day in prices[sym] else "" for sym in columns]]
        for day in days
    ])
    ohlc = csv_bytes(["Date", *[f"{sym}_Open" for sym in targets]], [
        [day, *[f"{prices[sym][day][0]:.10g}" for sym in targets]] for day in days
    ])
    return targets, columns, days, panel, ohlc


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--period", default="3y")
    parser.add_argument("--through", help="Inclusive observation date YYYY-MM-DD")
    parser.add_argument("--output", type=Path, default=REPO_ROOT / "data/stocks/multivariate.csv")
    args = parser.parse_args()
    now = datetime.now(ZoneInfo("Asia/Tokyo"))
    cutoff = date.fromisoformat(args.through) if args.through else (
        now.date() if now.hour >= 18 else now.date() - timedelta(days=1)
    )
    if cutoff > now.date():
        parser.error("Future cutoff")
    import yfinance as yf
    symbols = list(dict.fromkeys([*(s for members in SECTORS.values() for s in members), *MACRO]))
    prices, failures = {}, {}
    for symbol in symbols:
        try:
            prices[symbol] = prices_from_history(yf.Ticker(symbol).history(
                period=args.period, interval="1d", auto_adjust=False, actions=False
            ), cutoff)
            print(f"{symbol}: {len(prices[symbol])} daily bars, latest={max(prices[symbol])}", flush=True)
        except Exception as exc:
            failures[symbol] = str(exc)
            print(f"Unavailable {symbol}: {exc}", flush=True)
    targets, columns, days, panel, opens = build_panel(prices, SECTORS)
    latest_target_dates = {symbol: max(prices[symbol]) for symbol in targets}
    latest_observed = max(latest_target_dates.values())
    print(f"Latest complete target session: {days[-1]}; latest individual target quote: {latest_observed}", flush=True)
    if latest_observed > days[-1]:
        incomplete = sorted(symbol for symbol in targets if latest_observed not in prices[symbol])
        print(
            f"::warning::Incomplete target prices for {latest_observed}; "
            f"last complete session {days[-1]}; missing: {', '.join(incomplete)}",
            flush=True,
        )
    path = args.output
    open_path = path.with_name(path.stem + ".opens.csv")
    write_if_changed(path, panel)
    write_if_changed(open_path, opens)
    # Stable group definitions for each *potential* target; same-session factors
    # are explicitly forbidden later by the feature generator.
    groups = {}
    for target in targets:
        sector = next(name for name, peers in SECTORS.items() if target in peers)
        peers = [s for s in SECTORS[sector] if s in columns and s != target]
        groups[target] = {
            "sector_peers": peers,
            "japan_market": [s for s in ("^N225", "^TOPX", "JPY=X") if s in columns],
            "global_macro": [s for s in ("^GSPC", "CL=F", "JPY=X") if s in columns],
            "sector_plus_market": [*peers, *[s for s in ("^N225", "JPY=X") if s in columns]],
        }
    meta = {
        "source": "Yahoo Finance via yfinance", "cutoff_date": cutoff.isoformat(),
        "retrieved_at_utc": datetime.now(timezone.utc).isoformat(),
        "first_date": days[0], "last_date": days[-1], "sessions": len(days),
        "targets": targets, "symbols": columns, "groups": groups,
        "latest_target_quote_dates": latest_target_dates,
        "foreign_symbols": sorted(FOREIGN), "failed_symbols": failures,
        "panel_sha256": hashlib.sha256(panel).hexdigest(),
        "opens_sha256": hashlib.sha256(opens).hexdigest(),
        "opens_file": open_path.name,
        "note": "No predictive finding is inferred by downloading these series."
    }
    path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Saved {len(days)} sessions, {len(targets)} candidate targets: {path}")


if __name__ == "__main__":
    main()
