import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Row } from "reactstrap";

/** Appointment-style list pagination (0-based page). */
const buildPageItems = (pageIndex, pageCount) => {
  if (pageCount <= 0) return [];
  let startPage = Math.max(0, pageIndex - 1);
  let endPage = Math.min(pageCount - 1, pageIndex + 1);
  const pages = [];
  if (startPage > 0) {
    pages.push(0);
    if (startPage > 1) pages.push("ellipsis-start");
  }
  for (let i = startPage; i <= endPage; i += 1) pages.push(i);
  if (endPage < pageCount - 1) {
    if (endPage < pageCount - 2) pages.push("ellipsis-end");
    pages.push(pageCount - 1);
  }
  return pages;
};

const CrmListPagination = ({
  page = 0,
  pageSize = 50,
  totalCount = 0,
  onPageChange,
  className = "",
}) => {
  const pageCount = Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1)));
  const pageIndex = Math.min(Math.max(0, page), pageCount - 1);
  const start = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const end = Math.min((pageIndex + 1) * pageSize, totalCount);
  const pageItems = useMemo(
    () => buildPageItems(pageIndex, pageCount),
    [pageIndex, pageCount]
  );

  if (totalCount <= 0 || typeof onPageChange !== "function") return null;

  const goTo = (nextIndex, e) => {
    if (e) e.preventDefault();
    if (nextIndex < 0 || nextIndex >= pageCount || nextIndex === pageIndex) return;
    onPageChange(nextIndex);
  };

  return (
    <div className={`px-3 py-2 border-top ${className}`.trim()}>
      <Row className="align-items-center g-3 text-center text-sm-start">
        <div className="col-sm">
          <div className="text-muted fs-13">
            Showing <span className="fw-semibold text-body mx-1">{start} to {end}</span> of{" "}
            <span className="fw-semibold text-body mx-1">{totalCount}</span> Results
          </div>
        </div>
        <div className="col-sm-auto">
          <ul className="pagination pagination-separated pagination-md justify-content-center justify-content-sm-start mb-0">
            <li className={pageIndex <= 0 ? "page-item disabled" : "page-item"}>
              <Link to="#" className="page-link" onClick={(e) => goTo(pageIndex - 1, e)}>
                Previous
              </Link>
            </li>
            {pageItems.map((item) =>
              typeof item === "string" ? (
                <li key={item} className="page-item disabled">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={item} className={item === pageIndex ? "page-item active" : "page-item"}>
                  <Link to="#" className="page-link" onClick={(e) => goTo(item, e)}>
                    {item + 1}
                  </Link>
                </li>
              )
            )}
            <li className={pageIndex >= pageCount - 1 ? "page-item disabled" : "page-item"}>
              <Link to="#" className="page-link" onClick={(e) => goTo(pageIndex + 1, e)}>
                Next
              </Link>
            </li>
          </ul>
        </div>
      </Row>
    </div>
  );
};

export default CrmListPagination;
