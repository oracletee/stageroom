/**
 * Cost estimation utilities for Cloudflare services
 * Helps estimate monthly costs based on usage patterns
 */

/**
 * Estimate Cloudflare Stream costs
 * Based on Cloudflare Stream pricing (as of 2026)
 * - $5 per 1000 minutes of video stored
 * - $1 per 1000 minutes of video delivered
 */
export const estimateStreamCosts = (
  storageMinutes: number,  // Minutes of video stored
  deliveryMinutes: number  // Minutes of video delivered/viewed
): { storage: number; delivery: number; total: number } => {
  const storageCost = (storageMinutes / 1000) * 5;
  const deliveryCost = (deliveryMinutes / 1000) * 1;
  
  return {
    storage: parseFloat(storageCost.toFixed(2)),
    delivery: parseFloat(deliveryCost.toFixed(2)),
    total: parseFloat((storageCost + deliveryCost).toFixed(2))
  };
};

/**
 * Estimate Cloudflare R2 costs
 * Based on Cloudflare R2 pricing (as of 2026)
 * - $0.015 per GB-month of storage
 * - $0.00 per GB of data transferred out (first 10 TB free)
 * - $0.01 per 10,000 read operations
 * - $0.05 per 10,000 write operations
 */
export const estimateR2Costs = (
  storageGB: number,      // GB of storage per month
  readOps: number,        // Number of read operations
  writeOps: number,       // Number of write operations
  dataTransferGB: number  // GB of data transferred out
): { storage: number; operations: number; transfer: number; total: number } => {
  const storageCost = storageGB * 0.015;
  const operationsCost = (readOps / 10000) * 0.01 + (writeOps / 10000) * 0.05;
  const transferCost = Math.max(0, (dataTransferGB - 10240)) * 0.02; // First 10TB free, then $0.02/GB
  
  return {
    storage: parseFloat(storageCost.toFixed(2)),
    operations: parseFloat(operationsCost.toFixed(2)),
    transfer: parseFloat(transferCost.toFixed(2)),
    total: parseFloat((storageCost + operationsCost + transferCost).toFixed(2))
  };
};

/**
 * Estimate Cloudflare Workers costs
 * Based on Cloudflare Workers pricing (as of 2026)
 * - $0.000015 per 1000 requests (Workers Paid)
 * - First 100,000 requests per day free
 * - $0.000001 per GB-second of compute time
 */
export const estimateWorkersCosts = (
  requestsPerMonth: number,   // Number of requests
  avgComputeTimeMs: number,   // Average compute time per request in milliseconds
  avgMemoryMb: number         // Average memory used per request in MB
): { requests: number; compute: number; total: number } => {
  // Free tier: 100,000 requests per day = 3,000,000 per month
  const billableRequests = Math.max(0, requestsPerMonth - 3000000);
  const requestCost = (billableRequests / 1000) * 0.000015;
  
  // Compute time in GB-seconds
  const computeSeconds = (requestsPerMonth * avgComputeTimeMs) / 1000;
  const computeGBSeconds = (computeSeconds * avgMemoryMb) / 1024;
  const computeCost = computeGBSeconds * 0.000001;
  
  return {
    requests: parseFloat(requestCost.toFixed(2)),
    compute: parseFloat(computeCost.toFixed(2)),
    total: parseFloat((requestCost + computeCost).toFixed(2))
  };
};

/**
 * Estimate total monthly cost for the Stageroom
 */
export const estimateMonthlyCost = (
  streamStorageMinutes: number,
  streamDeliveryMinutes: number,
  r2StorageGB: number,
  r2ReadOps: number,
  r2WriteOps: number,
  r2DataTransferGB: number,
  workersRequestsPerMonth: number,
  workersAvgComputeTimeMs: number,
  workersAvgMemoryMb: number
) => {
  const streamCosts = estimateStreamCosts(streamStorageMinutes, streamDeliveryMinutes);
  const r2Costs = estimateR2Costs(r2StorageGB, r2ReadOps, r2WriteOps, r2DataTransferGB);
  const workersCosts = estimateWorkersCosts(workersRequestsPerMonth, workersAvgComputeTimeMs, workersAvgMemoryMb);
  
  return {
    stream: streamCosts,
    r2: r2Costs,
    workers: workersCosts,
    total: parseFloat(
      (streamCosts.total + r2Costs.total + workersCosts.total).toFixed(2)
    )
  };
};

/**
 * Provide optimization recommendations based on usage patterns
 */
export const getOptimizationRecommendations = (
  streamStorageMinutes: number,
  streamDeliveryMinutes: number,
  r2StorageGB: number,
  workersRequestsPerMonth: number
) => {
  const recommendations = [];
  
  if (streamStorageMinutes > 10000) { // > ~166 hours stored
    recommendations.push({
      area: 'Storage',
      recommendation: 'Consider implementing automatic deletion of old recordings after 30-90 days',
      potentialSavings: 'Up to 50% on storage costs'
    });
  }
  
  if (streamDeliveryMinutes > 50000) { // > ~833 hours delivered
    recommendations.push({
      area: 'Delivery',
      recommendation: 'Enable adaptive bitrate streaming to reduce bandwidth for viewers with slower connections',
      potentialSavings: '20-30% on delivery costs'
    });
  }
  
  if (r2StorageGB > 1000) { // > 1TB
    recommendations.push({
      area: 'R2 Storage',
      recommendation: 'Implement lifecycle rules to move infrequently accessed assets to cheaper storage tiers',
      potentialSavings: '40-60% on storage costs'
    });
  }
  
  if (workersRequestsPerMonth > 1000000) { // > 1M requests
    recommendations.push({
      area: 'Workers',
      recommendation: 'Cache frequent API responses and use conditional requests to reduce compute',
      potentialSavings: '15-25% on compute costs'
    });
  }
  
  return recommendations;
};