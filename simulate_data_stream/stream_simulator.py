import time
import csv
import os
from pathlib import Path

# ---------------------------------
# Resolve project root & paths
# ---------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Allow multiple destinations via environment variables
# Format: STREAM_FILES=path1,path2
STREAM_FILES_RAW = os.getenv("STREAM_FILES", "")
if STREAM_FILES_RAW:
    STREAM_FILES = [Path(p.strip()) for p in STREAM_FILES_RAW.split(",")]
else:
    # Default fallback destinations
    STREAM_FILES = [
        PROJECT_ROOT / "country_monitoring" / "country_level_threats" / "data" / "supply_chain_stream.csv",
        PROJECT_ROOT / "reputation_monitoring" / "data" / "supply_chain_stream.csv"
    ]

MASTER_FILE = Path(os.getenv("MASTER_FILE", PROJECT_ROOT / "simulate_data_stream" / "master_supply_chain.csv"))

INTERVAL_SEC = 2 # seconds


def simulate_stream():
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Master CSV not found: {MASTER_FILE}")

    for stream_file in STREAM_FILES:
        stream_file.parent.mkdir(parents=True, exist_ok=True)

    with MASTER_FILE.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    # Reset stream files
    for stream_file in STREAM_FILES:
        with stream_file.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()

    print("📡 Stream simulator started")
    print(f"📂 Writing to {len(STREAM_FILES)} destinations")

    for i, row in enumerate(rows, start=1):
        for stream_file in STREAM_FILES:
            with stream_file.open("a", newline="", encoding="utf-8") as f:
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
