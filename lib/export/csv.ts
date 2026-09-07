export type CsvColumn<Row> = { header: string; value: (row: Row) => string | number };

export type PanelColumn<Row> = {
  header: string;
  sortValue?: (row: Row) => number | string;
  text?: (row: Row) => number | string;
};

export function csvColumns<Row>(columns: readonly PanelColumn<Row>[]): CsvColumn<Row>[] {
  const output: CsvColumn<Row>[] = [];
  for (const column of columns) {
    const value = column.text ?? column.sortValue;
    if (value) output.push({ header: column.header, value });
  }
  return output;
}

const BOM = "\uFEFF";
const NEEDS_QUOTE = /[",\n\r]/;
const LEADING_FORMULA = /^\s*[=+\-@]|^[\t\r\n]/;

function cell(value: string | number): string {
  const text = String(value);
  const safe = typeof value === "string" && LEADING_FORMULA.test(text) ? `'${text}` : text;
  if (!NEEDS_QUOTE.test(safe)) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv<Row>(columns: readonly CsvColumn<Row>[], rows: readonly Row[]): string {
  const lines = [columns.map((column) => cell(column.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => cell(column.value(row))).join(","));
  }
  return `${BOM}${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(name: string, body: string): void {
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name.endsWith(".csv") ? name : `${name}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
