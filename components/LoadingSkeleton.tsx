import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-pulse">
      {/* Main Content Skeleton — must match lg:col-span-8 */}
      <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[16/9] bg-gray-200 dark:bg-gray-800 w-full rounded-md"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 w-1/4 rounded-sm"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-800 w-full rounded-sm"></div>
            <div className="h-5 bg-gray-200 dark:bg-gray-800 w-3/4 rounded-sm"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 w-full rounded-sm"></div>
          </div>
        ))}
      </div>

      {/* Sidebar Skeleton — must match lg:col-span-4 */}
      <div className="lg:col-span-4 space-y-6 hidden lg:block">
        <div className="h-5 bg-gray-200 dark:bg-gray-800 w-1/2 rounded-sm mb-2"></div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-16 w-20 flex-shrink-0 bg-gray-200 dark:bg-gray-800 rounded-md"></div>
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-gray-200 dark:bg-gray-800 w-full rounded-sm"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 w-full rounded-sm"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 w-2/3 rounded-sm"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};