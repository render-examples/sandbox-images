"""Offline workload acceptance check; uses synthetic data only."""
import argparse
import json
from pathlib import Path
import tempfile

import duckdb
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from PIL import Image


def run(output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="analysis-fixture-") as tmp:
        fixture = Path(tmp)
        (fixture / "orders.csv").write_text(
            "order_id,customer_id,amount_cents\n1,10,1200\n2,20,2500\n2,20,2500\n3,10,\n4,20,800\n"
        )
        pd.DataFrame({"customer_id": [10, 20], "segment": ["small", "large"]}).to_parquet(fixture / "customers.parquet", index=False)
        pd.DataFrame({"segment": ["small", "large"], "target_cents": [1000, 3000]}).to_excel(fixture / "targets.xlsx", index=False)
        orders = pd.read_csv(fixture / "orders.csv").drop_duplicates("order_id")
        orders["amount_cents"] = orders.amount_cents.fillna(0).astype("int64")
        joined = orders.merge(pd.read_parquet(fixture / "customers.parquet"), on="customer_id", validate="many_to_one")
        with duckdb.connect() as db:
            db.register("orders", joined)
            totals = db.execute("SELECT segment, sum(amount_cents)::BIGINT AS amount_cents FROM orders GROUP BY segment ORDER BY segment").df()
        totals = totals.merge(pd.read_excel(fixture / "targets.xlsx"), on="segment", validate="one_to_one")
        expected = [{"segment": "large", "amount_cents": 3300, "target_cents": 3000}, {"segment": "small", "amount_cents": 1200, "target_cents": 1000}]
        actual = totals.to_dict(orient="records")
        if actual != expected or int(np.sum(totals.amount_cents.to_numpy())) != 4500:
            raise RuntimeError(f"Unexpected aggregation: {actual}")
        totals.to_csv(output / "totals.csv", index=False)
        totals.to_parquet(output / "totals.parquet", index=False)
        fig, ax = plt.subplots(figsize=(6, 4), dpi=100)
        ax.bar(totals.segment, totals.amount_cents)
        ax.set_ylabel("Revenue (cents)")
        fig.tight_layout()
        fig.savefig(output / "revenue.png")
        plt.close(fig)
        with Image.open(output / "revenue.png") as image:
            image.load()
            if image.size != (600, 400):
                raise RuntimeError(f"Unexpected chart dimensions: {image.size}")
        if pd.read_parquet(output / "totals.parquet").to_dict(orient="records") != expected:
            raise RuntimeError("Parquet output round trip failed")
        result = {"status": "passed", "total_cents": 4500, "rows": 2, "artifacts": ["totals.csv", "totals.parquet", "revenue.png"]}
        (output / "result.json").write_text(json.dumps(result, indent=2) + "\n")
        print(json.dumps(result))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("/workspace/output"))
    run(parser.parse_args().output)
