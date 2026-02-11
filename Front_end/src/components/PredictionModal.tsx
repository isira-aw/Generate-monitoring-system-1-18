'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
}

interface HistoricalDataPoint {
  timestamp: string;
  value: number;
}

interface PredictionData {
  currentLevel?: number;
  currentSoc?: number;
  declineRate: number | null;
  predictedRuntimeHours: number | null;
  predictedRuntimeMinutes: number | null;
  estimatedEmptyTime: string | null;
  historicalData: HistoricalDataPoint[];
  hasEnoughData: boolean;
  message: string;
}

interface PredictionResponse {
  fuelPrediction: PredictionData;
  batteryPrediction: PredictionData;
}

export default function PredictionModal({ isOpen, onClose, deviceId }: PredictionModalProps) {
  const [predictionData, setPredictionData] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPredictionData();
    }
  }, [isOpen, deviceId]);

  const fetchPredictionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${apiUrl}/api/predictions/${deviceId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch prediction data');
      }

      const data: PredictionResponse = await response.json();
      setPredictionData(data);
    } catch (err) {
      console.error('Error fetching prediction data:', err);
      setError('Failed to load prediction data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatRuntime = (hours: number | null): string => {
    if (hours === null || hours === undefined) return 'N/A';

    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);

    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const formatDateTime = (dateString: string | null): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const createChartOptions = (title: string, data: HistoricalDataPoint[], yAxisTitle: string): ApexOptions => {
    return {
      chart: {
        type: 'area',
        height: 350,
        zoom: {
          enabled: false
        },
        toolbar: {
          show: true,
          tools: {
            download: true,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: false
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight',
        width: 2
      },
      title: {
        text: title,
        align: 'left',
        style: {
          fontSize: '16px',
          fontWeight: 'bold'
        }
      },
      subtitle: {
        text: 'Historical Trend',
        align: 'left'
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeFormatter: {
            hour: 'HH:mm'
          }
        }
      },
      yaxis: {
        title: {
          text: yAxisTitle
        },
        labels: {
          formatter: (value) => value.toFixed(1)
        }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        }
      },
      tooltip: {
        x: {
          format: 'dd MMM HH:mm'
        }
      },
      colors: ['#FF7F00']
    };
  };

  const createChartSeries = (data: HistoricalDataPoint[]) => {
    return [{
      name: 'Level',
      data: data.map(point => ({
        x: new Date(point.timestamp).getTime(),
        y: point.value
      }))
    }];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <br /><br />
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <br />
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h2 className="text-2xl font-bold text-white">AI Support - Runtime Predictions</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading prediction data...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="ml-3 text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && predictionData && (
            <div className="space-y-6">
              {/* Fuel Prediction */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Generator Fuel Runtime Prediction
                  </h3>
                </div>

                <div className="p-4">
                  {predictionData.fuelPrediction.hasEnoughData ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="text-sm text-blue-800 font-medium mb-1">Current Fuel Level</div>
                          <div className="text-3xl font-bold text-blue-900">
                            {predictionData.fuelPrediction.currentLevel?.toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-purple-800 font-medium mb-1">Decline Rate</div>
                          <div className="text-3xl font-bold text-purple-900">
                            {predictionData.fuelPrediction.declineRate?.toFixed(2)}%/h
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="text-sm text-green-800 font-medium mb-1">Predicted Runtime</div>
                          <div className="text-3xl font-bold text-green-900">
                            {formatRuntime(predictionData.fuelPrediction.predictedRuntimeHours)}
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <div className="text-sm text-orange-800 font-medium mb-1">Estimated Empty Time</div>
                          <div className="text-lg font-bold text-orange-900">
                            {formatDateTime(predictionData.fuelPrediction.estimatedEmptyTime)}
                          </div>
                        </div>
                      </div>

                      {predictionData.fuelPrediction.historicalData.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <Chart
                            options={createChartOptions('Fuel Level Trend', predictionData.fuelPrediction.historicalData, 'Fuel Level (%)')}
                            series={createChartSeries(predictionData.fuelPrediction.historicalData)}
                            type="area"
                            height={350}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="ml-3 text-yellow-700">{predictionData.fuelPrediction.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Battery Prediction */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-4 py-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    </svg>
                    Battery Drain Time Prediction
                  </h3>
                </div>

                <div className="p-4">
                  {predictionData.batteryPrediction.hasEnoughData ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <div className="text-sm text-blue-800 font-medium mb-1">Current Battery SOC</div>
                          <div className="text-3xl font-bold text-blue-900">
                            {predictionData.batteryPrediction.currentSoc?.toFixed(1)}%
                          </div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                          <div className="text-sm text-purple-800 font-medium mb-1">Decline Rate</div>
                          <div className="text-3xl font-bold text-purple-900">
                            {predictionData.batteryPrediction.declineRate?.toFixed(2)}%/h
                          </div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                          <div className="text-sm text-green-800 font-medium mb-1">Predicted Runtime</div>
                          <div className="text-3xl font-bold text-green-900">
                            {formatRuntime(predictionData.batteryPrediction.predictedRuntimeHours)}
                          </div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <div className="text-sm text-orange-800 font-medium mb-1">Estimated Empty Time</div>
                          <div className="text-lg font-bold text-orange-900">
                            {formatDateTime(predictionData.batteryPrediction.estimatedEmptyTime)}
                          </div>
                        </div>
                      </div>

                      {predictionData.batteryPrediction.historicalData.length > 0 && (
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <Chart
                            options={createChartOptions('Battery SOC Trend', predictionData.batteryPrediction.historicalData, 'Battery SOC (%)')}
                            series={createChartSeries(predictionData.batteryPrediction.historicalData)}
                            type="area"
                            height={350}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                      <div className="flex">
                        <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="ml-3 text-yellow-700">{predictionData.batteryPrediction.message}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Information Footer */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">How predictions work:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>System collects fuel and battery data every 30 minutes</li>
                      <li>Stores the latest 10 records for analysis</li>
                      <li>Calculates decline rate based on historical trend</li>
                      <li>Predicts remaining runtime using: Current Level ÷ Decline Rate</li>
                      <li>Requires at least 2 data points for accurate predictions</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 sticky bottom-0">
          <button
            onClick={fetchPredictionData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
