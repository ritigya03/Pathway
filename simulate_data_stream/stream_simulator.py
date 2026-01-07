import time
import csv
import os
from pathlib import Path

# ---------------------------------
# Resolve paths RELATIVE to project root
# ---------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

DATA_DIR = BASE_DIR / "pathway" / "supply_chain" / "data"
MASTER_FILE = DATA_DIR / "master_supply_chain.csv"
STREAM_FILE = DATA_DIR / "supply_chain_stream.csv"

INTERVAL_SEC = 30  # write one record every 30 seconds


def simulate_stream():
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Master CSV not found: {MASTER_FILE}")

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Read master file
    with MASTER_FILE.open(newline="", encoding="utf-8") as f:
        reader = list(csv.reader(f))

    header = reader[0]
    rows = reader[1:]

    # Reset stream file WITH header
    with STREAM_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(header)

    print("📡 Stream simulator started")
    print(f"📂 Writing to: {STREAM_FILE}")

    for i, row in enumerate(rows, start=1):
        with STREAM_FILE.open("a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(row)

        print(
            f"➕ Streamed row {i} | "
            f"record_id={row[0]} | "
            f"supplier={row[2]} | "
            f"country={row[7]}"
        )

        time.sleep(INTERVAL_SEC)

    print("✅ Streaming complete")


if __name__ == "__main__":
    simulate_stream()
