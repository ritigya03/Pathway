import pathway as pw

# -----------------------------
# 1. Define schema WITH key
# -----------------------------
class SupplyChainSchema(pw.Schema):
    __key__: str          # 👈 Pathway primary key
    record_id: str
    buyer_firm: str
    supplier_firm: str
    product_name: str
    product_category: str
    quantity: float
    unit: str
    source_location: str
    destination_location: str
    contract_id: str
    start_date: str
    end_date: str
    last_updated: str


# -----------------------------
# 2. Read CSV as LIVE stream
# -----------------------------
supply_chain_table = pw.io.csv.read(
    "data/supply_chain_stream.csv",
    schema=SupplyChainSchema,
    mode="streaming",
)

# -----------------------------
# 3. Live change logger
# -----------------------------
def on_change(key, row, time, is_addition):
    rid = row["record_id"]

    if is_addition:
        print(f"➕ ADDED   | id={rid} | supplier={row['supplier_firm']} | qty={row['quantity']}")
    else:
        print(f"✏️ UPDATED | id={rid} | supplier={row['supplier_firm']} | qty={row['quantity']}")

def on_end():
    print("⛔ Stream ended")

pw.io.subscribe(
    supply_chain_table,
    on_change=on_change,
    on_end=on_end,
)

# -----------------------------
# 4. Run engine
# -----------------------------
pw.run(monitoring_level=pw.MonitoringLevel.NONE)
