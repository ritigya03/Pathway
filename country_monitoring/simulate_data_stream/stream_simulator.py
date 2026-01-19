import time
import csv
import os
from pathlib import Path

# ---------------------------------
# Resolve project root & paths
# ---------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Allow overriding via environment variables for Docker
MASTER_FILE = Path(os.getenv("MASTER_FILE", PROJECT_ROOT / "simulate_data_stream" / "master_supply_chain.csv"))
STREAM_FILE = Path(os.getenv("STREAM_FILE", PROJECT_ROOT / "country_level_threats" / "data" / "supply_chain_stream.csv"))

INTERVAL_SEC = 5 # seconds


def simulate_stream():
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Master CSV not found: {MASTER_FILE}")

    STREAM_FILE.parent.mkdir(parents=True, exist_ok=True)

    with MASTER_FILE.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    # Reset stream file
    with STREAM_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

    print("📡 Stream simulator started")
    print(f"📂 Writing to: {STREAM_FILE}")

    for i, row in enumerate(rows, start=1):
        with STREAM_FILE.open("a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writerow(row)

        print(
            f"➕ Streamed row {i} | "
            f"record_id={row.get('record_id')} | "
            f"supplier={row.get('supplier_firm')} | "
            f"country={row.get('source_country')}"
        )

        time.sleep(INTERVAL_SEC)

    print("✅ Streaming complete")


if __name__ == "__main__":
    simulate_stream()
