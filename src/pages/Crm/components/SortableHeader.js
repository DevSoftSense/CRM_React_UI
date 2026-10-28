import React from "react";
import { Input } from "reactstrap";

/** Same helpers as Appointment SortableHeader */
export const matchesColumn = (value, query) => {
  if (!query) return true;
  return String(value ?? "")
    .toLowerCase()
    .includes(String(query).toLowerCase().trim());
};

export const compareSortValues = (a, b, dir) => {
  const av = a ?? "";
  const bv = b ?? "";
  const aNum =
    typeof av === "number"
      ? av
      : typeof av === "string" && av.trim() !== "" && !Number.isNaN(Number(av))
        ? Number(av)
        : null;
  const bNum =
    typeof bv === "number"
      ? bv
      : typeof bv === "string" && bv.trim() !== "" && !Number.isNaN(Number(bv))
        ? Number(bv)
        : null;
  if (aNum !== null && bNum !== null) {
    return dir === "asc" ? aNum - bNum : bNum - aNum;
  }
  const cmp = String(av).localeCompare(String(bv), undefined, {
    numeric: true,
    sensitivity: "base",
  });
  return dir === "asc" ? cmp : -cmp;
};

export const SortableHeader = ({
  column,
  sortConfig,
  onSort,
  filterValue,
  onFilterChange,
  hasFilter = true,
  placeholder = "Search...",
  width,
  minWidth,
  maxWidth,
  style,
  className,
}) => {
  const sorted = sortConfig?.key === column?.key ? sortConfig.dir : false;
  const colWidth = width || column?.width;
  const colMinWidth = minWidth || column?.minWidth;
  const colMaxWidth = maxWidth || column?.maxWidth;

  const thStyle = {
    ...(colWidth ? { width: colWidth } : {}),
    ...(colMinWidth ? { minWidth: colMinWidth } : {}),
    ...(colMaxWidth ? { maxWidth: colMaxWidth } : {}),
    ...column?.style,
    ...style,
  };

  return (
    <th
      style={Object.keys(thStyle).length ? thStyle : undefined}
      className={className || column?.className}
    >
      <div className="apt-list-header-cell" style={{ width: "100%" }}>
        <div
          className="apt-list-header-label"
          role="button"
          tabIndex={0}
          onClick={() => onSort && onSort(column.key)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSort && onSort(column.key);
            }
          }}
          aria-label={`Sort by ${column.label}`}
        >
          <span>{column.label}</span>
          <span className="apt-list-sort-arrows" aria-hidden>
            <span style={{ opacity: sorted === "asc" ? 1 : 0.3 }}>▲</span>
            <span style={{ opacity: sorted === "desc" ? 1 : 0.3 }}>▼</span>
          </span>
        </div>
        {hasFilter && onFilterChange ? (
          <div className="w-100" onClick={(e) => e.stopPropagation()}>
            <Input
              type="text"
              bsSize="sm"
              className="form-control form-control-sm apt-list-colfilters__input"
              style={{
                width: "100%",
                maxWidth: column?.inputWidth || "100%",
                ...(column?.inputStyle || {}),
              }}
              placeholder={placeholder}
              value={filterValue || ""}
              onChange={(e) => onFilterChange(column.key, e.target.value)}
              aria-label={`Filter ${column.label}`}
            />
          </div>
        ) : null}
      </div>
    </th>
  );
};

export default SortableHeader;
