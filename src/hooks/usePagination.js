import { useState, useMemo, useCallback } from 'react';

/**
 * Custom hook for client-side pagination with optimized performance
 * @param {Array} data - The full dataset to paginate
 * @param {number} initialPageSize - Initial items per page (default: 50)
 * @returns {Object} - Pagination state and controls
 */
export function usePagination(data, initialPageSize = 50) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(data.length / pageSize);
  }, [data.length, pageSize]);

  // Get paginated data for current page
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, pageSize]);

  // Navigation functions
  const goToPage = useCallback((page) => {
    const pageNumber = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNumber);
  }, [totalPages]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  }, [totalPages]);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  }, []);

  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes
  }, []);

  // Reset to first page when data changes significantly
  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    // Data
    paginatedData,
    totalItems: data.length,
    
    // Current state
    currentPage,
    pageSize,
    totalPages,
    
    // Navigation functions
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    changePageSize,
    resetPagination,
    
    // Computed values
    startIndex: (currentPage - 1) * pageSize + 1,
    endIndex: Math.min(currentPage * pageSize, data.length),
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
}

export default usePagination;
