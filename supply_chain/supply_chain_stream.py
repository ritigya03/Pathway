import pathway as pw

# -----------------------------
# 1. Define schema (NO __key__)
# -----------------------------
class SupplyChainSchema(pw.Schema):
    record_id: str
    buyer_firm: str
    supplier_firm: str
    contract_id: str

    # Product & contract context
    product_name: str
    product_category: str
    quantity: float
    unit: str
    start_date: str
    end_date: str
    last_updated: str

    # Location context (for news correlation)
    source_country: str
    source_region: str
    source_city: str
    destination_country: str

    # Supplier operational context
    supplier_industry: str 

    primary_transport_mode: str      # sea, air, road, rail
    port_dependency: str  


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
