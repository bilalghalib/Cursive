'use client';

import { ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react';
import type { Page } from '@/lib/types';

interface PageNavigationProps {
  pages: Page[];
  currentPageId: string;
  onPreviousPage: () => void;
  onNextPage: () => void;
  onGoToPage: (pageId: string) => void;
  onAddPage: () => void;
}

export function PageNavigation({
  pages,
  currentPageId,
  onPreviousPage,
  onNextPage,
  onGoToPage,
  onAddPage
}: PageNavigationProps) {
  const currentPageIndex = pages.findIndex(p => p.id === currentPageId);
  const currentPage = pages[currentPageIndex];
  const isFirstPage = currentPageIndex === 0;
  const isLastPage = currentPageIndex === pages.length - 1;

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-md border border-gray-200">
      {/* Previous page button */}
      <button
        onClick={onPreviousPage}
        disabled={isFirstPage}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Previous page"
      >
        <ChevronLeft className="w-5 h-5 text-gray-700" />
      </button>

      {/* Page dropdown selector */}
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-600" />
        <select
          value={currentPageId}
          onChange={(e) => onGoToPage(e.target.value)}
          className="px-3 py-1 bg-gray-50 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {pages.map((page, index) => (
            <option key={page.id} value={page.id}>
              Page {index + 1}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600">
          of {pages.length}
        </span>
      </div>

      {/* Next page button */}
      <button
        onClick={onNextPage}
        disabled={isLastPage}
        className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next page"
      >
        <ChevronRight className="w-5 h-5 text-gray-700" />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-gray-300" />

      {/* Add page button */}
      <button
        onClick={onAddPage}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
        title="Add new page"
      >
        <Plus className="w-4 h-4" />
        Add Page
      </button>

      {/* Page info */}
      {currentPage && (
        <div className="ml-2 text-xs text-gray-500">
          {currentPage.size} · {currentPage.orientation}
        </div>
      )}
    </div>
  );
}
