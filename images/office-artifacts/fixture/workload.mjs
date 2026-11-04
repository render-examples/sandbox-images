import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import ExcelJS from "exceljs";
import { Document, Paragraph, Packer, TextRun } from "docx";
import pptxgen from "pptxgenjs";
import AdmZip from "adm-zip";
import { XMLValidator, XMLParser } from "fast-xml-parser";
const json = async (p, x) => writeFile(p, JSON.stringify(x, null, 2) + "\n");
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const rows = [
  ["Service", 1250],
  ["Storage", 2000],
  ["Support", 101],
];
async function prepare(inputDir) {
  await json(join(inputDir, "orders.json"), rows);
}
function xml(zip, name) {
  const entry = zip.getEntry(name);
  assert.ok(entry, "Missing OOXML part " + name);
  const s = entry.getData().toString("utf8");
  assert.equal(XMLValidator.validate(s), true);
  return s;
}
const reportSummary = {
  rows: 3,
  totalCents: 3351,
  artifacts: 2,
  formulaCacheChecked: true,
};
async function verifyReport({ inputDir, outputDir }) {
  const data = await read(join(inputDir, "orders.json"));
  const total = data.reduce((n, r) => n + r[1], 0);
  assert.equal(total, 3351);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(join(outputDir, "report.xlsx"));
  const sheet = workbook.getWorksheet("Orders");
  assert.ok(sheet);
  assert.equal(sheet.rowCount, 5);
  assert.deepEqual(sheet.getRow(1).values.slice(1), ["Category", "Cents"]);
  data.forEach((row, i) =>
    assert.deepEqual(sheet.getRow(i + 2).values.slice(1), row),
  );
  assert.equal(sheet.getCell("B5").formula, "SUM(B2:B4)");
  assert.equal(sheet.getCell("B5").result, total);
  const xlsx = new AdmZip(join(outputDir, "report.xlsx"));
  xml(xlsx, "xl/workbook.xml");
  xml(xlsx, "xl/worksheets/sheet1.xml");
  const doc = new AdmZip(join(outputDir, "report.docx"));
  const content = xml(doc, "word/document.xml");
  assert.ok(content.includes("Synthetic monthly report"));
  assert.ok(content.includes("Total: 3351 cents"));
  for (const row of data)
    assert.ok(content.includes(row[0] + ": " + row[1] + " cents"));
  assert.deepEqual(await read(join(outputDir, "report-data.json")), {
    rows: data,
    totalCents: total,
  });
  return {
    rows: data.length,
    totalCents: total,
    artifacts: 2,
    formulaCacheChecked: true,
  };
}
const presentationSummary = {
  slides: 2,
  rows: 3,
  totalCents: 3351,
  textShapes: 6,
};
async function verifyPresentation({ inputDir, outputDir }) {
  const data = await read(join(inputDir, "orders.json"));
  const archive = new AdmZip(join(outputDir, "presentation.pptx"));
  const parts = archive
    .getEntries()
    .map((e) => e.entryName)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  assert.equal(parts.length, 2);
  const presentation = xml(archive, "ppt/presentation.xml");
  assert.ok(presentation.includes("p:sldSz"));
  let textShapes = 0;
  for (const name of parts) {
    const content = xml(archive, name);
    const parsed = new XMLParser({ ignoreAttributes: false }).parse(content);
    assert.ok(parsed["p:sld"]["p:cSld"]["p:spTree"]);
    textShapes += (content.match(/<p:sp>/g) || []).length;
    for (const match of content.matchAll(/<a:off x="(\d+)" y="(\d+)"\/>/g)) {
      assert.ok(+match[1] < 13.334 * 914400);
      assert.ok(+match[2] < 7.501 * 914400);
    }
  }
  const first = xml(archive, "ppt/slides/slide1.xml");
  const second = xml(archive, "ppt/slides/slide2.xml");
  assert.ok(first.includes("Synthetic monthly summary"));
  assert.ok(first.includes("3351 cents"));
  for (const [category, cents] of data)
    assert.ok(second.includes(category + ": " + cents + " cents"));
  assert.equal(textShapes, 6);
  return {
    slides: parts.length,
    rows: data.length,
    totalCents: data.reduce((n, r) => n + r[1], 0),
    textShapes,
  };
}
export const scenarios = {
  "reporting-workspace": {
    expectedSummary: reportSummary,
    artifacts: ["report.xlsx", "report.docx", "report-data.json"],
    prepare,
    async run(ctx) {
      const rows = await read(join(ctx.inputDir, "orders.json"));
      const total = rows.reduce((n, r) => n + r[1], 0);
      const wb = new ExcelJS.Workbook();
      const sheet = wb.addWorksheet("Orders");
      sheet.addRow(["Category", "Cents"]);
      sheet.addRows(rows);
      sheet.addRow(["Total", { formula: "SUM(B2:B4)", result: total }]);
      sheet.getRow(1).font = { bold: true };
      sheet.getColumn(1).width = 24;
      await wb.xlsx.writeFile(join(ctx.outputDir, "report.xlsx"));
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Synthetic monthly report", bold: true }),
                ],
              }),
              ...rows.map(
                ([name, cents]) =>
                  new Paragraph(name + ": " + cents + " cents"),
              ),
              new Paragraph("Total: " + total + " cents"),
            ],
          },
        ],
      });
      await writeFile(
        join(ctx.outputDir, "report.docx"),
        await Packer.toBuffer(doc),
      );
      await json(join(ctx.outputDir, "report-data.json"), {
        rows,
        totalCents: total,
      });
      return verifyReport(ctx);
    },
    verify: verifyReport,
  },
  "presentation-workspace": {
    expectedSummary: presentationSummary,
    artifacts: ["presentation.pptx"],
    prepare,
    async run(ctx) {
      const rows = await read(join(ctx.inputDir, "orders.json"));
      const ppt = new pptxgen();
      ppt.layout = "LAYOUT_WIDE";
      ppt.author = "Render synthetic fixture";
      let slide = ppt.addSlide();
      slide.addText("Synthetic monthly summary", {
        x: 0.5,
        y: 0.5,
        w: 12,
        h: 0.8,
        fontSize: 28,
      });
      slide.addText(rows.reduce((n, r) => n + r[1], 0) + " cents", {
        x: 0.5,
        y: 1.8,
        w: 12,
        h: 1,
        fontSize: 32,
      });
      slide = ppt.addSlide();
      slide.addText("Category detail", {
        x: 0.5,
        y: 0.5,
        w: 12,
        h: 0.8,
        fontSize: 28,
      });
      rows.forEach(([name, cents], i) =>
        slide.addText(name + ": " + cents + " cents", {
          x: 0.5,
          y: 1.7 + i,
          w: 12,
          h: 0.7,
          fontSize: 20,
        }),
      );
      await ppt.writeFile({
        fileName: join(ctx.outputDir, "presentation.pptx"),
      });
      return verifyPresentation(ctx);
    },
    verify: verifyPresentation,
  },
};
