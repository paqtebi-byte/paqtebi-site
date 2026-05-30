import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-pulse">
      {/* Main Content Skeleton */}
      <div className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-4">
            <div className="h-48 bg-gray-200 w-full rounded-sm"></div>
            <div className="h-3 bg-gray-200 w-1/4 rounded-sm"></div>
            <div className="h-6 bg-gray-200 w-3/4 rounded-sm"></div>
            <div className="h-3 bg-gray-200 w-full rounded-sm"></div>
            <div className="h-3 bg-gray-200 w-full rounded-sm"></div>
          </div>
        ))}
      </div>
      
      {/* Sidebar Skeleton */}
      <div className="lg:col-span-3 space-y-8 hidden lg:block">
        <div className="h-6 bg-gray-200 w-1/2 rounded-sm mb-4"></div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-gray-200 w-full rounded-sm"></div>
              <div className="h-3 bg-gray-200 w-2/3 rounded-sm"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};