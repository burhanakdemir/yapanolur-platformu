/**
 * One-off: read .xls/.xlsx and print all cells that have formulas.
 * Usage: node scripts/dump-xls-formulas.mjs [path]
 */
import fs from "node:fs";
import path from "node:path";

function findLaboratuvarXls() {
  const root = "E:\\";
  const dirs = fs.readdirSync(root, { withFileTypes: true });
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    if (!d.name.toLowerCase().includes("laboratuvar")) continue;
    const p = path.join(root, d.name, "1.xls");
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const argPath = process.argv[2];
const filePath = argPath || findLaboratuvarXls();

if (!filePath || !fs.existsSync(filePath)) {
  console.error("Dosya bulunamadı. Argüman olarak tam yolu verin.");
  process.exit(1);
}

const XLSX = await import("xlsx");

const wb = XLSX.readFile(filePath, {
  type: "binary",
  cellFormula: true,
  cellNF: true,
  cellDates: true,
  bookVBA: true,
});

console.log("Dosya:", filePath);
console.log("Sayfalar:", wb.SheetNames.join(", "));
console.log("---");

for (const sheetName of wb.SheetNames) {
  const ws = wb.Sheets[sheetName];
  if (!ws || !ws["!ref"]) {
    console.log(`\n[${sheetName}] (boş veya ref yok)`);
    continue;
  }
  const ref = XLSX.utils.decode_range(ws["!ref"]);
  const rows = [];
  for (let R = ref.s.r; R <= ref.e.r; R++) {
    for (let C = ref.s.c; C <= ref.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      const f = cell.f;
      if (f == null || f === "") continue;
      const v = cell.v;
      rows.push({ addr, formula: String(f), value: v, t: cell.t });
    }
  }
  console.log(`\n## ${sheetName} — formüllü hücre: ${rows.length}`);
  for (const r of rows) {
    const valStr = r.value === undefined ? "" : JSON.stringify(r.value);
    console.log(`${r.addr}\t${r.formula}\t=> ${valStr}`);
  }
}
