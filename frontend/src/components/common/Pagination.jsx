import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);

            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        return pages;
    };

    return (
        <div className="pagination" id="pagination">
            <button
                className="pagination-btn pagination-nav"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
            >
                <FiChevronLeft size={18} />
            </button>

            {getPageNumbers().map((page, index) =>
                page === '...' ? (
                    <span key={`dot-${index}`} className="pagination-dots">...</span>
                ) : (
                    <button
                        key={page}
                        className={`pagination-btn ${currentPage === page ? 'pagination-active' : ''}`}
                        onClick={() => onPageChange(page)}
                    >
                        {page}
                    </button>
                )
            )}

            <button
                className="pagination-btn pagination-nav"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
            >
                <FiChevronRight size={18} />
            </button>
        </div>
    );
};

export default Pagination;
