import { useState, useEffect } from 'react';

interface AnalyticsDashboardProps {
  summary?: boolean;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ summary }) => {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-1">Analytics</h2>
        <p className="text-sm text-gray-400">
          Stream analytics will appear here when live
        </p>
      </div>

      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">No analytics data available</p>
        <p className="text-gray-500 text-xs mt-1">Start streaming to see real-time stats</p>
      </div>
    </div>
  );
};
