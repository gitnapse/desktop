import type { ReactNode } from "react";

export interface TableColumn<Row> {
  key: string;
  header: string;
  align?: "left" | "right";
  mono?: boolean;
  render: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  columns: readonly TableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row) => string;
  caption?: string;
  emptyMessage?: string;
}

export function Table<Row>({
  columns,
  rows,
  rowKey,
  caption,
  emptyMessage = "NO ROWS",
}: TableProps<Row>) {
  return (
    <table className="table">
      {caption ? <caption className="t-label">{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={column.align === "right" ? "table__cell--num" : undefined}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="t-label">
              {`[${emptyMessage}]`}
            </td>
          </tr>
        ) : (
          rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    [
                      column.align === "right" ? "table__cell--num" : "",
                      column.mono ? "table__cell--mono" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
