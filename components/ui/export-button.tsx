"use client";

import { useTranslation } from "@/lib/i18n/provider";

import { Button } from "@/components/ui/button";
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/export/csv";

export function ExportButton<Row>({
  name,
  columns,
  rows
}: {
  name: string;
  columns: readonly CsvColumn<Row>[];
  rows: readonly Row[];
}) {
  const t = useTranslation();

  return (
    <Button
      label={t("Save as CSV")}
      variant="quiet"
      size="small"
      onClick={() => {
        downloadCsv(name, toCsv(columns, rows));
      }}
    />
  );
}
