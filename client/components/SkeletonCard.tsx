import React from 'react';

export const SkeletonCard = () => {
  return (
    <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-6 animate-pulse">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Left: Market Info Placeholder */}
        <div className="flex-1 space-y-3">
          {/* Badges */}
          <div className="flex items-center space-x-2">
            <div className="h-6 w-24 bg-gray-300"></div>
            <div className="h-6 w-16 bg-gray-300"></div>
          </div>
          
          {/* Title */}
          <div className="h-8 w-3/4 bg-gray-300"></div>
          
          {/* Details */}
          <div className="flex items-center space-x-4">
            <div className="h-5 w-32 bg-gray-300"></div>
            <div className="h-5 w-24 bg-gray-300"></div>
          </div>
          
          {/* Pool Info */}
          <div className="h-5 w-48 bg-gray-300"></div>
          
          {/* Odds */}
          <div className="flex items-center space-x-4">
            <div className="h-4 w-20 bg-gray-300"></div>
            <div className="h-4 w-20 bg-gray-300"></div>
          </div>
        </div>

        {/* Right: User Bet Info Placeholder */}
       
      </div>
    </div>
  );
};
