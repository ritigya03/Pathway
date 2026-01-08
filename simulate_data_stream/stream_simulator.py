import time
import csv
from pathlib import Path

# ---------------------------------
# Resolve project root
# ---------------------------------
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Paths based on YOUR folder structure
MASTER_FILE = PROJECT_ROOT / "simulate_data_stream" / "master_supply_chain.csv"
STREAM_FILE = PROJECT_ROOT / "supply_chain" / "data" / "supply_chain_stream.csv"

INTERVAL_SEC = 30  # seconds


def simulate_stream():
    if not MASTER_FILE.exists():
        raise FileNotFoundError(f"Master CSV not found: {MASTER_FILE}")

    STREAM_FILE.parent.mkdir(parents=True, exist_ok=True)

    # Read master file
    with MASTER_FILE.open(newline="", encoding="utf-8") as f:
        reader = list(csv.reader(f))

    header = reader[0]
    rows = reader[1:]

    # Reset stream file with header
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
