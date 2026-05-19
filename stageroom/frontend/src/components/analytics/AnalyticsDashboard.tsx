import { useState, useEffect } from 'react';
import { measureRender } from '../../utils/performance';
import { estimateMonthlyCost, getOptimizationRecommendations } from '../../utils/costEstimator';

// Define interfaces for our analytics data
interface StreamMetrics {
  viewers: number;
  peakViewers: number;
  averageViewDuration: number; // in seconds
  totalWatchTime: number; // in minutes
  newFollowers: number;
  chatMessages: number;
  peakChatRate: number; // messages per minute
}

interface PlatformStats {
  name: string;
  viewers: number;
  status: 'connected' | 'disconnected' | 'connecting';
}

interface AnalyticsDashboardProps {
  summary?: boolean;
}

// Main component
export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ summary }) => {
  // State variables
  const [metrics, setMetrics] = useState<StreamMetrics | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [costData, setCostData] = useState(null);
  const [optimizationRecommendations, setOptimizationRecommendations] = useState([]);

  // Simulate fetching analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate sample metrics with performance measurement
      const sampleMetrics: StreamMetrics = measureRender('SampleMetricsGeneration', () => ({
        viewers: Math.floor(Math.random() * 150) + 50,
        peakViewers: Math.floor(Math.random() * 300) + 200,
        averageViewDuration: Math.floor(Math.random() * 1200) + 300, // 5-20 minutes
        totalWatchTime: Math.floor(Math.random() * 500) + 100, // 100-600 minutes
        newFollowers: Math.floor(Math.random() * 50) + 10,
        chatMessages: Math.floor(Math.random() * 1000) + 200,
        peakChatRate: Math.floor(Math.random() * 50) + 10
      }));
      
      setMetrics(sampleMetrics);
      
      // Generate sample platform stats with performance measurement
      const samplePlatformStats: PlatformStats[] = measureRender('SamplePlatformStatsGeneration', () => [
        {
          name: 'YouTube',
          viewers: Math.floor(Math.random() * 100) + 30,
          status: Math.random() > 0.2 ? 'connected' : 'disconnected'
        },
        {
          name: 'Twitch',
          viewers: Math.floor(Math.random() * 80) + 20,
          status: Math.random() > 0.3 ? 'connected' : 'disconnected'
        },
        {
          name: 'Facebook',
          viewers: Math.floor(Math.random() * 60) + 10,
          status: Math.random() > 0.4 ? 'connected' : 'disconnected'
        }
      ]);
      
      setPlatformStats(samplePlatformStats);
      setIsLoading(false);
      
      // Simulate streaming status
      setIsStreaming(Math.random() > 0.3);
    };
    
    fetchAnalytics();
    
    // Update every 10 seconds
    const interval = setInterval(fetchAnalytics, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate cost and optimization recommendations when metrics change
  useEffect(() => {
    if (metrics) {
      // Convert metrics to cost estimation parameters
      // Note: These are simplified conversions for demonstration
      const streamStorageMinutes = metrics.totalWatchTime; // Assuming total watch time approximates storage needs
      const streamDeliveryMinutes = metrics.totalWatchTime * 2; // Assuming delivery is roughly 2x watch time (accounting for multiple viewers)
      const r2StorageGB = (metrics.totalWatchTime / 60) * 0.1; // Rough estimate: 0.1 GB per hour of video
      const r2ReadOps = metrics.chatMessages * 10; // Assume each chat message triggers 10 read operations
      const r2WriteOps = metrics.newFollowers * 5; // Assume each new follower triggers 5 write operations
      const r2DataTransferGB = (metrics.totalWatchTime / 60) * 0.5; // Rough estimate: 0.5 GB per hour of video transferred
      const workersRequestsPerMonth = (metrics.chatMessages + metrics.newFollowers) * 30; // Approximate monthly requests
      const workersAvgComputeTimeMs = 50; // Average 50ms compute time per request
      const workersAvgMemoryMb = 128; // Average 128MB memory per request
      
      const costData = estimateMonthlyCost(
        streamStorageMinutes,
        streamDeliveryMinutes,
        r2StorageGB,
        r2ReadOps,
        r2WriteOps,
        r2DataTransferGB,
        workersRequestsPerMonth,
        workersAvgComputeTimeMs,
        workersAvgMemoryMb
      );
      
      setCostData(costData);
      
      // Get optimization recommendations
      const recommendations = getOptimizationRecommendations(
        streamStorageMinutes,
        streamDeliveryMinutes,
        r2StorageGB,
        workersRequestsPerMonth
      );
      
      setOptimizationRecommendations(recommendations);
    }
  }, [metrics]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!metrics) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="text-center py-8">
          <p className="text-gray-400">No analytics data available</p>
        </div>
      </div>
    );
  }

  // Render the dashboard
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Analytics Dashboard</h2>
        <p className="text-sm text-gray-400">
          Real-time statistics for your live stream
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Viewers Card */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">Current Viewers</h3>
              <p className="text-sm text-gray-400">Across all platforms</p>
            </div>
            <div className="text-2xl font-bold text-blue-400">
              {metrics.viewers}
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>Peak: </span>
            <span className="font-medium">{metrics.peakViewers}</span>
          </div>
        </div>
        
        {/* Watch Time Card */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">Total Watch Time</h3>
              <p className="text-sm text-gray-400">Combined across viewers</p>
            </div>
            <div className="text-2xl font-bold text-green-400">
              {metrics.totalWatchTime}
            </div>
            <span className="text-xs text-gray-400">hrs</span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-400">
            <span>Avg. View: </span>
            <span className="font-medium">
              {Math.floor(metrics.averageViewDuration / 60)}:{String(metrics.averageViewDuration % 60).padStart(2, '0')}
            </span>
          </div>
        </div>
        
        {/* Engagement Card */}
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-white">Engagement</h3>
              <p className="text-sm text-gray-400">Chat & Followers</p>
            </div>
            <div className="text-2xl font-bold text-purple-400">
              {metrics.newFollowers}
            </div>
            <span className="text-xs text-gray-400">new</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
            <div>
              <span>Messages:</span>
              <span className="font-medium">{metrics.chatMessages}</span>
            </div>
            <div>
              <span>Peak Rate:</span>
              <span className="font-medium">{metrics.peakChatRate}/min</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-3">Platform Status</h3>
        <div className="space-y-3">
          {platformStats.map((platform) => (
                 <div
                   key={platform.name}
                   className={`flex items-center justify-between p-3 bg-gray-900 rounded ${platform.status === 'connected' ? 'border-l-4 border-green-500' : platform.status === 'connecting' ? 'border-l-4 border-yellow-500' : 'border-l-4 border-red-500'}`}
                 >
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {platform.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-white">{platform.name}</p>
                    <p className="text-xs text-gray-400">
                      {platform.status === 'connected'
                        ? 'Online'
                        : platform.status === 'connecting'
                        ? 'Connecting...'
                        : 'Offline'}
                    </p>
                  </div>
                </div>
                <div className="text-right space-x-3">
                  <span className={`font-medium text-${platform.status === 'connected' ? 'green-400' :
                                platform.status === 'connecting' ? 'yellow-400' :
                                'red-400'}`}>
                    {platform.viewers}
                  </span>
                  <span className="text-xs text-gray-400 ml-2">viewers</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
         <div className="mt-4 pt-3 border-t border-gray-700">
           <div className="flex justify-between text-xs text-gray-400">
             <span>Stream Status:</span>
             <span className={`font-medium text-${isStreaming ? 'green-400' : 'red-400'}`}>
               {isStreaming ? 'LIVE' : 'OFFLINE'}
             </span>
           </div>
         </div>
         
          {!summary && costData && (
            <div className="mt-4">
             <h3 className="text-lg font-semibold mb-3">Cost Analysis</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-gray-900 rounded-lg p-4">
                 <div className="flex items-center justify-between mb-2">
                   <div>
                     <h4 className="font-semibold text-white">Stream</h4>
                     <p className="text-sm text-gray-400">Storage & Delivery</p>
                   </div>
                  <div className="text-2xl font-bold text-blue-400">
                      {costData.stream.total}
                    </div>
                 </div>
                 <div className="text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Storage:</span>
                      <span>{costData.stream.storage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Delivery:</span>
                      <span>{costData.stream.delivery}</span>
                    </div>
                 </div>
               </div>
               
               <div className="bg-gray-900 rounded-lg p-4">
                 <div className="flex items-center justify-between mb-2">
                   <div>
                     <h4 className="font-semibold text-white">Storage</h4>
                     <p className="text-sm text-gray-400">R2 Storage</p>
                   </div>
                  <div className="text-2xl font-bold text-green-400">
                      {costData.r2.total}
                    </div>
                 </div>
                 <div className="text-xs text-gray-400">
                    <div className="flex justify-between">
                      <span>Storage:</span>
                      <span>{costData.r2.storage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operations:</span>
                      <span>{costData.r2.operations}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transfer:</span>
                      <span>{costData.r2.transfer}</span>
                    </div>
                 </div>
               </div>
               
               <div className="bg-gray-900 rounded-lg p-4">
                 <div className="flex items-center justify-between mb-2">
                   <div>
                     <h4 className="font-semibold text-white">Compute</h4>
                     <p className="text-sm text-gray-400">Workers</p>
                   </div>
                   <div className="text-2xl font-bold text-purple-400">
                     ${costData.workers.total}
                   </div>
                 </div>
                 <div className="text-xs text-gray-400">
                   <div className="flex justify-between">
                     <span>Requests:</span>
                     <span>${costData.workers.requests}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Compute:</span>
                     <span>${costData.workers.compute}</span>
                   </div>
                 </div>
               </div>
             </div>
             <div className="mt-4 pt-3 border-t border-gray-700">
              <div className="flex justify-between text-sm font-medium text-white">
                <span>Total Monthly Cost:</span>
                <span>{costData.total}</span>
              </div>
             </div>
           </div>
         )}
         
          {!summary && optimizationRecommendations.length > 0 && (
           <div className="mt-4">
             <h3 className="text-lg font-semibold mb-3">Optimization Recommendations</h3>
             <div className="space-y-3">
               {optimizationRecommendations.map((rec, index) => (
                 <div key={index} className="bg-gray-900 rounded-lg p-4">
                   <div className="flex mb-2">
                     <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-medium text-white">
                       !
                     </div>
                     <div>
                       <h4 className="font-semibold text-white">{rec.area}</h4>
                       <p className="text-sm text-gray-400">{rec.recommendation}</p>
                     </div>
                   </div>
                   <p className="text-xs text-green-400 font-medium">
                     Potential Savings: {rec.potentialSavings}
                   </p>
                 </div>
               ))}
             </div>
           </div>
          )}
      </div>
    );
};