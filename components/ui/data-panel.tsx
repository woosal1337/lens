"use client";

import { useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as stylex from "@stylexjs/stylex";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { color, font, motion, shape, space, type } from "@/styles/tokens.stylex";

export type Column<Row> = {
  id: string;
  header: string;
  hint?: string;
  align?: "start" | "end";
  width?: string;
  render: (row: Row) => React.ReactNode;
  sortValue?: (row: Row) => number | string;
  text?: (row: Row) => number | string;
};

const OVERSCAN = 14;

const styles = stylex.create({
  frame: {
    height: shape.panelHeight,
    display: "grid",
    gridTemplateRows: "auto 1fr",
    borderRadius: shape.radiusL,
    borderWidth: shape.hairline,
    borderStyle: "solid",
    borderColor: color.line,
    backgroundColor: color.surfaceRaised,
    overflow: "hidden"
  },
  head: {
    display: "grid",
    backgroundColor: color.surfaceSunken,
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line
  },
  headRow: { display: "flex", alignItems: "center", gap: space.s2 },
  headCell: {
    display: "flex",
    flexDirection: "column",
    gap: space.s1,
    alignItems: "flex-start",
    backgroundColor: "none",
    borderWidth: 0,
    textAlign: "start",
    paddingBlock: space.s3,
    paddingInline: space.s4,
    cursor: { default: "default", ":enabled": "pointer" },
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: shape.focusOffset
  },
  headCellEnd: { alignItems: "flex-end", textAlign: "end" },
  headLabel: {
    fontFamily: font.mono,
    fontSize: type.microSize,
    fontWeight: type.microWeight,
    letterSpacing: type.microTracking,
    lineHeight: type.microLine,
    whiteSpace: "nowrap",
    color: { default: color.fgSubtle, ":hover": color.fg }
  },
  headActive: { color: color.fg },
  headHint: {
    fontFamily: font.sans,
    fontSize: type.microSize,
    letterSpacing: "normal",
    lineHeight: type.microLine,
    color: color.fgSubtle,
    whiteSpace: "nowrap"
  },
  scroller: { overflowY: "auto", overflowX: "hidden", minHeight: 0 },
  body: { position: "relative", width: "100%" },
  row: {
    display: "grid",
    position: "absolute",
    insetInlineStart: 0,
    width: "100%",
    alignItems: "center",
    borderBlockEndWidth: shape.hairline,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.line,
    backgroundColor: { default: "transparent", ":hover": color.surfaceHover },
    transitionProperty: "background-color",
    transitionDuration: motion.hover,
    transitionTimingFunction: motion.ease
  },
  clickable: {
    cursor: "pointer",
    outline: { default: "none", ":focus-visible": `${shape.focusWidth} solid ${color.lineFocus}` },
    outlineOffset: `-${shape.focusWidth}`
  },
  flagged: { boxShadow: `inset ${shape.stripe} 0 0 ${color.signal}` },
  cell: {
    fontFamily: font.sans,
    fontSize: type.bodySize,
    letterSpacing: type.bodyTracking,
    color: color.fg,
    paddingBlock: space.s2,
    paddingInline: space.s4,
    minWidth: 0
  },
  cellEnd: { textAlign: "end" }
});

function compare(a: number | string, b: number | string) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

export function DataPanel<Row>({
  columns,
  rows,
  rowKey,
  emptyTitle,
  emptyDetail,
  isFlagged,
  initialSort,
  onOpen
}: {
  columns: readonly Column<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  emptyTitle: string;
  emptyDetail: string;
  isFlagged?: (row: Row) => boolean;
  initialSort?: { id: string; direction: "asc" | "desc" };
  onOpen?: (row: Row) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sort, setSort] = useState(initialSort ?? null);

  const template = columns.map((column) => column.width ?? "1fr").join(" ");
  const active = sort ? columns.find((column) => column.id === sort.id) : undefined;
  const sortValue = active?.sortValue;
  const direction = sort?.direction;

  const ordered = sortValue
    ? [...rows].sort((left, right) => {
        const result = compare(sortValue(left), sortValue(right));
        return direction === "desc" ? -result : result;
      })
    : rows;

  const virtualizer = useVirtualizer({
    count: ordered.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 52,
    overscan: OVERSCAN
  });

  function toggleSort(id: string) {
    setSort((current) => {
      if (current?.id !== id) return { id, direction: "desc" };
      return { id, direction: current.direction === "desc" ? "asc" : "desc" };
    });
  }

  return (
    <div {...stylex.props(styles.frame)}>
      <div style={{ gridTemplateColumns: template }} {...stylex.props(styles.head)}>
        {columns.map((column) => (
          <button
            key={column.id}
            type="button"
            onClick={() => {
              toggleSort(column.id);
            }}
            disabled={!column.sortValue}
            {...stylex.props(styles.headCell, column.align === "end" && styles.headCellEnd)}
          >
            <span {...stylex.props(styles.headRow)}>
              <span
                {...stylex.props(styles.headLabel, sort?.id === column.id && styles.headActive)}
              >
                {column.header}
              </span>
              {sort?.id === column.id ? (
                <Icon
                  name={sort.direction === "desc" ? "sortDown" : "sortUp"}
                  size="small"
                  tone="primary"
                />
              ) : null}
            </span>
            {column.hint === undefined ? null : (
              <span {...stylex.props(styles.headHint)}>{column.hint}</span>
            )}
          </button>
        ))}
      </div>

      {ordered.length === 0 ? (
        <EmptyState title={emptyTitle} detail={emptyDetail} />
      ) : (
        <div ref={scrollRef} {...stylex.props(styles.scroller)}>
          <div style={{ height: virtualizer.getTotalSize() }} {...stylex.props(styles.body)}>
            {virtualizer.getVirtualItems().map((item) => {
              const row = ordered[item.index];
              if (!row) return null;
              return (
                <div
                  key={rowKey(row)}
                  role={onOpen === undefined ? undefined : "button"}
                  tabIndex={onOpen === undefined ? undefined : 0}
                  onClick={
                    onOpen === undefined
                      ? undefined
                      : () => {
                          onOpen(row);
                        }
                  }
                  onKeyDown={
                    onOpen === undefined
                      ? undefined
                      : (event) => {
                          if (event.key === "Enter" || event.key === " ") onOpen(row);
                        }
                  }
                  style={{
                    gridTemplateColumns: template,
                    height: item.size,
                    transform: `translateY(${item.start}px)`
                  }}
                  {...stylex.props(
                    styles.row,
                    onOpen !== undefined && styles.clickable,
                    isFlagged?.(row) === true && styles.flagged
                  )}
                >
                  {columns.map((column) => (
                    <div
                      key={column.id}
                      {...stylex.props(styles.cell, column.align === "end" && styles.cellEnd)}
                    >
                      {column.render(row)}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
