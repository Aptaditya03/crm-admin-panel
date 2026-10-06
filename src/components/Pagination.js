import React, { memo } from 'react';

/**
 * Reusable Pagination Component for large datasets
 * Memoized to prevent unnecessary re-renders
 */
const Pagination = memo(function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  pageSize,
  onPageChange,
  onPageSizeChange,
  hasNextPage,
  hasPreviousPage,
  onFirstPage,
  onLastPage,
  onNextPage,
  onPreviousPage,
  pageSizeOptions = [25, 50, 100, 200]
}) {
  // Generate page numbers to show (max 5 pages around current)
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  if (totalPages <= 1 && totalItems <= pageSizeOptions[0]) {
    return null; // Don't show pagination if not needed
  }

  return (
    <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 p-3 bg-light rounded-3 mt-3">
      {/* Left side - showing info */}
      <div className="text-muted" style={{ fontSize: '0.85rem' }}>
        Showing <strong>{startIndex}</strong> - <strong>{endIndex}</strong> of <strong>{totalItems}</strong> records
      </div>
      
      {/* Center - page navigation */}
      <nav aria-label="Table navigation">
        <ul className="pagination pagination-sm mb-0">
          {/* First page button */}
          <li className={`page-item ${!hasPreviousPage ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={onFirstPage}
              disabled={!hasPreviousPage}
              title="First Page"
            >
              <i className="fas fa-angle-double-left"></i>
            </button>
          </li>
          
          {/* Previous page button */}
          <li className={`page-item ${!hasPreviousPage ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={onPreviousPage}
              disabled={!hasPreviousPage}
              title="Previous Page"
            >
              <i className="fas fa-angle-left"></i>
            </button>
          </li>
          
          {/* Page numbers */}
          {getPageNumbers().map(page => (
            <li key={page} className={`page-item ${page === currentPage ? 'active' : ''}`}>
              <button 
                className="page-link"
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            </li>
          ))}
          
          {/* Next page button */}
          <li className={`page-item ${!hasNextPage ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={onNextPage}
              disabled={!hasNextPage}
              title="Next Page"
            >
              <i className="fas fa-angle-right"></i>
            </button>
          </li>
          
          {/* Last page button */}
          <li className={`page-item ${!hasNextPage ? 'disabled' : ''}`}>
            <button 
              className="page-link" 
              onClick={onLastPage}
              disabled={!hasNextPage}
              title="Last Page"
            >
              <i className="fas fa-angle-double-right"></i>
            </button>
          </li>
        </ul>
      </nav>
      
      {/* Right side - page size selector */}
      <div className="d-flex align-items-center gap-2">
        <label className="text-muted mb-0" style={{ fontSize: '0.85rem' }}>
          Per page:
        </label>
        <select 
          className="form-select form-select-sm" 
          style={{ width: 'auto' }}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {pageSizeOptions.map(size => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </div>
    </div>
  );
});

export default Pagination;
