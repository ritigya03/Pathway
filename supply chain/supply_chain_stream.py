import pathway as pw

# -----------------------------
# 1. Define schema (NO __key__)
# -----------------------------
class SupplyChainSchema(pw.Schema):
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
# 3. Assign primary key
# -----------------------------
supply_chain_table = supply_chain_table.with_columns(
    __key__=pw.this.record_id
)
