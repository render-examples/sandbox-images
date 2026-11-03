#!/usr/bin/env python3
"""Prepare and verify a small, fully synthetic analytics snapshot.

No network calls, credentials, random data, or external datasets are used.
The three source formats exercise dependencies that are otherwise easy to miss.
"""

import argparse
import hashlib
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd


EXPECTED = {
    "schemaVersion": 1,
    "rawOrders": 7,
    "cleanOrders": 6,
    "duplicatesRemoved": 1,
    "missingQuantitiesFilled": 1,
    "revenueCents": 21200,
    "revenueByRegionCents": {"east": 14100, "west": 7100},
}
INPUTS = ("orders.csv", "customers.parquet", "products.xlsx")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare(root):
    inputs = root / "input"
    inputs.mkdir(parents=True, exist_ok=True)
    # The duplicated order and missing quantity are intentional cleaning tasks.
    pd.DataFrame(
        [(1, "c1", "widget", 2), (2, "c2", "gadget", 1),
         (3, "c1", "widget", None), (4, "c3", "gadget", 3),
         (5, "c4", "widget", 1), (2, "c2", "gadget", 1),
         (6, "c2", "widget", 2)],
        columns=["order_id", "customer_id", "product", "quantity"],
    ).to_csv(inputs / "orders.csv", index=False)
    pd.DataFrame(
        [("c1", "east"), ("c2", "west"), ("c3", "east"), ("c4", "west")],
        columns=["customer_id", "region"],
    ).to_parquet(inputs / "customers.parquet", index=False)
    pd.DataFrame(
        [("widget", 1200), ("gadget", 3500)], columns=["product", "price_cents"]
    ).to_excel(inputs / "products.xlsx", index=False, engine="openpyxl")
    baseline = {
        "schemaVersion": 1,
        "fixture": "analytics-workbench-v1",
        "synthetic": True,
        "sha256": {name: digest(inputs / name) for name in INPUTS},
        "expected": EXPECTED,
    }
    (root / "baseline.json").write_text(json.dumps(baseline, indent=2) + "\n")
    print(json.dumps({"prepared": True, "fixture": baseline["fixture"]}))


def check_inputs(root):
    baseline = json.loads((root / "baseline.json").read_text())
    if baseline.get("fixture") != "analytics-workbench-v1" or baseline.get("expected") != EXPECTED:
        raise ValueError("Prepared baseline does not match this recipe revision")
    if set(baseline.get("sha256", {})) != set(INPUTS):
        raise ValueError("Prepared baseline is missing an input")
    for name in INPUTS:
        if digest(root / "input" / name) != baseline["sha256"][name]:
            raise ValueError(f"Input changed after preparation: {name}")
    return baseline


def analyze(root, output):
    check_inputs(root)
    orders = pd.read_csv(root / "input" / "orders.csv")
    customers = pd.read_parquet(root / "input" / "customers.parquet")
    products = pd.read_excel(root / "input" / "products.xlsx", engine="openpyxl")
    clean = orders.drop_duplicates("order_id").copy()
    missing = int(clean.quantity.isna().sum())
    clean["quantity"] = clean.quantity.fillna(1).astype(int)
    clean = clean.merge(customers, on="customer_id", validate="many_to_one")
    clean = clean.merge(products, on="product", validate="many_to_one")
    clean["revenue_cents"] = clean.quantity * clean.price_cents
    regional = clean.groupby("region").revenue_cents.sum().sort_index()
    summary = {
        "schemaVersion": 1,
        "rawOrders": len(orders),
        "cleanOrders": len(clean),
        "duplicatesRemoved": len(orders) - len(clean),
        "missingQuantitiesFilled": missing,
        "revenueCents": int(clean.revenue_cents.sum()),
        "revenueByRegionCents": {str(k): int(v) for k, v in regional.items()},
    }
    if summary != EXPECTED:
        raise ValueError(f"Unexpected analytics result: {summary}")
    output.mkdir(parents=True, exist_ok=True)
    clean.to_parquet(output / "clean-orders.parquet", index=False)
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    fig, ax = plt.subplots(figsize=(6, 4))
    ax.bar(regional.index, regional.values / 100, color="#4f46e5")
    ax.set(ylabel="Revenue (USD)", title="Synthetic revenue by region")
    fig.tight_layout()
    fig.savefig(output / "revenue.png", dpi=100)
    plt.close(fig)
    verify(root, output)


def verify(root, output):
    baseline = check_inputs(root)
    summary = json.loads((output / "summary.json").read_text())
    if summary != EXPECTED:
        raise ValueError("Summary differs from expected fixture results")
    clean = pd.read_parquet(output / "clean-orders.parquet")
    if len(clean) != 6 or int(clean.revenue_cents.sum()) != 21200:
        raise ValueError("Output table does not match expected results")
    if clean.order_id.duplicated().any() or clean.quantity.isna().any():
        raise ValueError("Output table still contains dirty inputs")
    pixels = plt.imread(output / "revenue.png")
    if pixels.shape[:2] != (400, 600) or float(pixels.std()) < 0.01:
        raise ValueError("Chart is missing, blank, or has unexpected dimensions")
    receipt = {"passed": True, "fixture": baseline["fixture"], "summary": summary,
               "inputSha256": baseline["sha256"],
               "outputSha256": {name: digest(output / name) for name in
                                ("summary.json", "clean-orders.parquet", "revenue.png")}}
    (output / "verification.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("prepare", "analyze", "verify"))
    parser.add_argument("--root", type=Path, default=Path("/workspace/analytics-workbench"))
    parser.add_argument("--output", type=Path, default=Path("/workspace/output"))
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.root)
    elif args.command == "analyze":
        analyze(args.root, args.output)
    else:
        verify(args.root, args.output)


if __name__ == "__main__":
    main()
