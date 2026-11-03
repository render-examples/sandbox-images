"""Synthetic PDF fixtures and a deterministic, CPU-only extraction workload."""

import csv
import hashlib
import io
import json
from pathlib import Path
import re
import subprocess
import tempfile

import pdfplumber
from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfgen import canvas

EXPECTED = {
    "documents": 2, "pages": 2, "tableRows": 2,
    "invoiceTotalCents": 21000, "receiptTotalCents": 4250,
}
INPUTS = ("invoice.pdf", "receipt-scan.pdf")
ARTIFACTS = ("extracted.json", "text.md", "tables.csv")
TABLE = [["Item", "Amount USD"], ["Consulting", "120.00"], ["Support", "90.00"]]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, data):
    path.write_text(json.dumps(data, indent=2) + "\n")


def prepare(root):
    inputs = root / "input"
    inputs.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(inputs / INPUTS[0]), pagesize=(612, 792), invariant=1)
    pdf.setFont("Helvetica", 18)
    pdf.drawString(60, 730, "INVOICE INV-1042")
    pdf.setFont("Helvetica", 12)
    pdf.drawString(60, 700, "Synthetic fixture. No real customer information.")
    for x in (60, 300, 500):
        pdf.line(x, 520, x, 640)
    for y in (520, 560, 600, 640):
        pdf.line(60, y, 500, y)
    for index, row in enumerate(TABLE):
        pdf.drawString(70, 615 - 40 * index, row[0])
        pdf.drawString(310, 615 - 40 * index, row[1])
    pdf.drawString(60, 480, "TOTAL USD 210.00")
    pdf.save()

    scan = Image.new("RGB", (1800, 1200), "white")
    draw = ImageDraw.Draw(scan)
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 64)
    for index, line in enumerate(("RECEIPT R2042", "TOTAL USD 42.50", "ITEMS 3", "SYNTHETIC TEST DOCUMENT")):
        draw.text((100, 100 + index * 170), line, fill="black", font=font)
    pdf = canvas.Canvas(str(inputs / INPUTS[1]), pagesize=(612, 408), invariant=1)
    pdf.drawImage(ImageReader(scan), 0, 0, width=612, height=408)
    pdf.save()
    write_json(root / "baseline.json", {
        "fixture": "document-processing-lab-v1", "synthetic": True,
        "expected": EXPECTED, "inputSha256": {name: digest(inputs / name) for name in INPUTS},
    })


def check_inputs(root):
    baseline = json.loads((root / "baseline.json").read_text())
    if baseline.get("fixture") != "document-processing-lab-v1" or baseline.get("expected") != EXPECTED:
        raise ValueError("Baseline does not match the pinned recipe")
    if set(baseline.get("inputSha256", {})) != set(INPUTS):
        raise ValueError("Baseline input set changed")
    for name in INPUTS:
        if digest(root / "input" / name) != baseline["inputSha256"][name]:
            raise ValueError(f"Input changed: {name}")
    return baseline


def extract(root):
    inputs = root / "input"
    with pdfplumber.open(inputs / INPUTS[0]) as pdf:
        if len(pdf.pages) != 1:
            raise ValueError("Unexpected invoice page count")
        text = pdf.pages[0].extract_text()
        table = pdf.pages[0].extract_table()
    with pdfplumber.open(inputs / INPUTS[1]) as pdf:
        if len(pdf.pages) != 1 or (pdf.pages[0].extract_text() or "").strip():
            raise ValueError("Scan fixture must have one page and no embedded text layer")
    with tempfile.TemporaryDirectory() as tmp:
        prefix = str(Path(tmp) / "receipt")
        subprocess.run(["pdftoppm", "-f", "1", "-singlefile", "-r", "150", "-png", str(inputs / INPUTS[1]), prefix], check=True, timeout=30, capture_output=True)
        ocr = subprocess.run(["tesseract", prefix + ".png", "stdout", "-l", "eng", "--psm", "6"], check=True, timeout=30, capture_output=True, text=True).stdout.strip()
    if "INVOICE INV-1042" not in text or table != TABLE:
        raise ValueError("Text or ruled-table extraction differs from the fixture")
    if "RECEIPT R2042" not in ocr or "ITEMS 3" not in ocr:
        raise ValueError("OCR did not recover the receipt identifier and item count")
    invoice_total = re.search(r"TOTAL USD (\d+)\.(\d{2})", text)
    receipt_total = re.search(r"TOTAL USD (\d+)\.(\d{2})", ocr)
    if not invoice_total or not receipt_total:
        raise ValueError("Missing extracted totals")
    cents = lambda match: int(match[1]) * 100 + int(match[2])
    summary = {"documents": 2, "pages": 2, "tableRows": len(table) - 1,
               "invoiceTotalCents": cents(invoice_total), "receiptTotalCents": cents(receipt_total)}
    if summary != EXPECTED:
        raise ValueError("Extracted summary differs from expected data")
    return {"summary": summary, "documents": [
        {"source": INPUTS[0], "page": 1, "method": "pdfplumber", "text": text, "table": table},
        {"source": INPUTS[1], "page": 1, "method": "poppler+tesseract-eng", "text": ocr},
    ]}


def derived_text(extracted):
    return "\n\n".join(f"## {doc['source']} — page {doc['page']} ({doc['method']})\n\n{doc['text']}" for doc in extracted["documents"]) + "\n"


def derived_csv(extracted):
    stream = io.StringIO(newline="")
    csv.writer(stream, lineterminator="\n").writerows(extracted["documents"][0]["table"])
    return stream.getvalue()


def analyze(root, output):
    check_inputs(root)
    output.mkdir(parents=True, exist_ok=True)
    extracted = extract(root)
    write_json(output / "extracted.json", extracted)
    (output / "text.md").write_text(derived_text(extracted))
    (output / "tables.csv").write_text(derived_csv(extracted))
    verify(root, output)


def verify(root, output):
    baseline = check_inputs(root)
    # Re-extract from preserved inputs instead of trusting an output's own totals.
    expected = extract(root)
    actual = json.loads((output / "extracted.json").read_text())
    if actual != expected:
        raise ValueError("Extracted data or source/page provenance changed")
    if (output / "text.md").read_text() != derived_text(expected):
        raise ValueError("Markdown output changed")
    if (output / "tables.csv").read_text() != derived_csv(expected):
        raise ValueError("CSV output changed")
    result = {"passed": True, "fixture": baseline["fixture"], "summary": expected["summary"],
              "inputSha256": baseline["inputSha256"],
              "outputSha256": {name: digest(output / name) for name in ARTIFACTS}}
    write_json(output / "verification.json", result)
    return result
