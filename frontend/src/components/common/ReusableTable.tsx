import React from 'react';
import '../../styles/table.css';
import { buttonClasses } from '../../styles/classes';

type Column<T> = {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
};

type ReusableTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  rowKey: keyof T | ((item: T) => string);
  onRowClick?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
};

export function ReusableTable<T extends { id: string }>({
  data,
  columns,
  emptyMessage = 'No data available.',
  rowKey,
  onRowClick,
  onEdit,
  onDelete,
  loading = false
}: ReusableTableProps<T>) {
  const getKey = (item: T): string => {
    if (typeof rowKey === 'function') {
      return rowKey(item);
    }
    const key = rowKey as keyof T;
    const value = item[key];
    return String(value);
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
        Loading...
      </div>
    );
  }

  if (!data.length) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#64748b" }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{
                  padding: "12px 16px",
                  textAlign: column.align || "left",
                  fontWeight: 600,
                  color: "#475569",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  borderBottom: "1px solid #e2e8f0",
                  width: column.width
                }}
              >
                {column.header}
              </th>
            ))}
            {(onEdit || onDelete) && <th style={{ width: '100px', borderBottom: "1px solid #e2e8f0" }}></th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={getKey(item)}
              onClick={() => onRowClick?.(item)}
              className={onRowClick ? 'tableRow' : ''}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  style={{
                    padding: "12px 16px",
                    textAlign: column.align || "left",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: "14px"
                  }}
                >
                  {column.render
                    ? column.render(item)
                    : String((item as Record<string, unknown>)[column.key] ?? '')}
                </td>
              ))}
              {(onEdit || onDelete) && (
                <td style={{ padding: "12px 16px", textAlign: 'right', borderBottom: "1px solid #e2e8f0" }}>
                  {onEdit && <button onClick={(e) => { e.stopPropagation(); onEdit(item); }} className={buttonClasses.tertiary}>Edit</button>}
                  {onDelete && <button onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} className={`${buttonClasses.tertiary} text-red-600 ml-2`}>Delete</button>}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}