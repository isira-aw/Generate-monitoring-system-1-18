'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { historyApi, deviceApi } from '@/lib/api';

interface Device {
  deviceId: string;
  name: string;
  location: string;
}

interface HistoryDataPoint {
  timestamp: string;
  parameters: Record<string, any>;
}

export default function HistoryPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;

  const [device, setDevice] = useState<Device | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [availableParameters, setAvailableParameters] = useState<Record<string, string>>({});
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [chartData, setChartData] = useState<{ timestamp: string; rpm: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDeviceInfo();
    loadParameters();

    // Set default dates (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setEndDate(formatDateTimeLocal(now));
    setStartDate(formatDateTimeLocal(yesterday));

    // Set default date for chart (today)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  }, [deviceId]);

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const loadDeviceInfo = async () => {
    try {
      const deviceData = await deviceApi.getDeviceDashboard(deviceId);
      setDevice(deviceData);
    } catch (err) {
      console.error('Failed to load device info:', err);
    }
  };

  const loadParameters = async () => {
    try {
      const params = await historyApi.getParameters();
      setAvailableParameters(params);

      // Select default parameters
      const defaultParams = [
        'rpm', 'generatorFrequency', 'generatorVoltageL1N',
        'generatorCurrentL1', 'generatorPL1', 'batteryVolts',
        'oilPressure', 'oilTemperature', 'fuelLevel'
      ];
      setSelectedParameters(defaultParams);
    } catch (err) {
      console.error('Failed to load parameters:', err);
    }
  };

  const handleParameterToggle = (param: string) => {
    setSelectedParameters(prev => {
      if (prev.includes(param)) {
        return prev.filter(p => p !== param);
      } else {
        return [...prev, param];
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedParameters(Object.keys(availableParameters));
  };

  const handleDeselectAll = () => {
    setSelectedParameters([]);
  };

  const handleLoadChartData = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setChartLoading(true);
    setError('');

    try {
      // Call new backend endpoint that returns averaged RPM data
      const data = await historyApi.getRpmChartData(deviceId, selectedDate);

      // Data is already averaged by minute from backend (max 1440 points)
      setChartData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chart data');
    } finally {
      setChartLoading(false);
    }
  };

  const handleQuery = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (selectedParameters.length === 0) {
      setError('Please select at least one parameter');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const startTime = new Date(startDate).toISOString();
      const endTime = new Date(endDate).toISOString();

      const data = await historyApi.queryHistory({
        deviceId,
        startTime,
        endTime,
        parameters: selectedParameters,
      });

      setHistoryData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load historical data');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!startDate || !endDate || selectedParameters.length === 0) {
      setError('Please select dates and parameters first');
      return;
    }

    setLoading(true);
    try {
      const startTime = new Date(startDate).toISOString();
      const endTime = new Date(endDate).toISOString();

      const blob = await historyApi.generatePdfReport({
        deviceId,
        startTime,
        endTime,
        parameters: selectedParameters,
      });

      // Download the PDF
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `generator_report_${deviceId}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate PDF report');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'YES' : 'NO';
    if (typeof value === 'number') return value.toFixed(2);
    return value.toString();
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <br /><br />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Documents and History</h1>
              {device && (
                <p className="text-gray-600 mt-2">
                  {device.name} ({device.deviceId})
                </p>
              )}
            </div>
            <button
              onClick={() => router.push(`/device/${deviceId}/dashboard`)}
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* RPM Area Chart Section - Rebuilt with 1-minute averaging */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            RPM Area Chart (Average per Minute)
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Shows average RPM values per minute (max 1440 data points per day). Each point represents the average of all RPM readings within that minute.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLoadChartData}
                disabled={chartLoading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition flex items-center"
              >
                {chartLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading...
                  </>
                ) : (
                  'Load Chart Data'
                )}
              </button>
            </div>
          </div>

          {chartData.length > 0 && (
            <div className="mt-6">
              <div className="bg-gray-100 p-3 rounded-md mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Data Points:</strong> {chartData.length} minutes (averaged from raw telemetry data)
                </p>
              </div>

              {/* Simple SVG Line Chart */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="overflow-x-auto">
                  <svg width="100%" height="400" className="border border-gray-100">
                    {(() => {
                      if (chartData.length === 0) return null;

                      const width = Math.max(1200, chartData.length * 2);
                      const height = 400;
                      const padding = { top: 20, right: 40, bottom: 60, left: 60 };
                      const chartWidth = width - padding.left - padding.right;
                      const chartHeight = height - padding.top - padding.bottom;

                      // Get min/max RPM values
                      const rpmValues = chartData.map(d => d.rpm);
                      const minRpm = Math.min(...rpmValues);
                      const maxRpm = Math.max(...rpmValues);
                      const rpmRange = maxRpm - minRpm || 1;

                      // Create path points
                      const points = chartData.map((point, index) => {
                        const x = padding.left + (index / (chartData.length - 1)) * chartWidth;
                        const y = padding.top + chartHeight - ((point.rpm - minRpm) / rpmRange) * chartHeight;
                        return { x, y, ...point };
                      });

                      // Create SVG path
                      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                      // Area fill path
                      const areaD = pathD + ` L ${points[points.length - 1].x} ${height - padding.bottom} L ${padding.left} ${height - padding.bottom} Z`;

                      // Y-axis labels
                      const yLabels = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
                        const value = minRpm + ratio * rpmRange;
                        const y = padding.top + chartHeight - ratio * chartHeight;
                        return { value: value.toFixed(0), y };
                      });

                      // X-axis labels (show every ~60th point for hourly marks)
                      const xLabels = points.filter((_, i) => i % 60 === 0 || i === points.length - 1);

                      return (
                        <g>
                          {/* Grid lines */}
                          {yLabels.map((label, i) => (
                            <line
                              key={`grid-${i}`}
                              x1={padding.left}
                              y1={label.y}
                              x2={width - padding.right}
                              y2={label.y}
                              stroke="#e5e7eb"
                              strokeWidth="1"
                            />
                          ))}

                          {/* Area fill */}
                          <path
                            d={areaD}
                            fill="#3b82f6"
                            fillOpacity="0.2"
                          />

                          {/* Line */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#3b82f6"
                            strokeWidth="2"
                          />

                          {/* Y-axis */}
                          <line
                            x1={padding.left}
                            y1={padding.top}
                            x2={padding.left}
                            y2={height - padding.bottom}
                            stroke="#6b7280"
                            strokeWidth="2"
                          />

                          {/* X-axis */}
                          <line
                            x1={padding.left}
                            y1={height - padding.bottom}
                            x2={width - padding.right}
                            y2={height - padding.bottom}
                            stroke="#6b7280"
                            strokeWidth="2"
                          />

                          {/* Y-axis labels */}
                          {yLabels.map((label, i) => (
                            <text
                              key={`ylabel-${i}`}
                              x={padding.left - 10}
                              y={label.y + 4}
                              textAnchor="end"
                              fontSize="12"
                              fill="#6b7280"
                            >
                              {label.value}
                            </text>
                          ))}

                          {/* X-axis labels */}
                          {xLabels.map((point, i) => {
                            const time = new Date(point.timestamp);
                            const timeStr = time.getHours().toString().padStart(2, '0') + ':' +
                                          time.getMinutes().toString().padStart(2, '0');
                            return (
                              <text
                                key={`xlabel-${i}`}
                                x={point.x}
                                y={height - padding.bottom + 20}
                                textAnchor="middle"
                                fontSize="11"
                                fill="#6b7280"
                              >
                                {timeStr}
                              </text>
                            );
                          })}

                          {/* Y-axis title */}
                          <text
                            x={padding.left - 45}
                            y={height / 2}
                            textAnchor="middle"
                            fontSize="12"
                            fill="#374151"
                            transform={`rotate(-90, ${padding.left - 45}, ${height / 2})`}
                          >
                            RPM (Average per Minute)
                          </text>

                          {/* Data points */}
                          {points.filter((_, i) => i % 10 === 0).map((point, i) => (
                            <circle
                              key={`point-${i}`}
                              cx={point.x}
                              cy={point.y}
                              r="3"
                              fill="#3b82f6"
                            >
                              <title>{`${new Date(point.timestamp).toLocaleTimeString()}: ${point.rpm.toFixed(2)} RPM`}</title>
                            </circle>
                          ))}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Data Table */}
              <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Average RPM
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chartData.map((point, index) => {
                        const time = new Date(point.timestamp);
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                              {time.toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900">
                              {point.rpm.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {chartData.length === 0 && !chartLoading && (
            <div className="mt-6 p-4 bg-gray-100 rounded-md text-center text-gray-600">
              Select a date and click "Load Chart Data" to view the RPM chart
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Select Time Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Parameter Selection */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Select Parameters</h2>
            <div className="space-x-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Select All
              </button>
              <span className="text-gray-400">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
            {Object.entries(availableParameters).map(([key, displayName]) => (
              <label
                key={key}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedParameters.includes(key)}
                  onChange={() => handleParameterToggle(key)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{displayName}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 text-sm text-gray-600">
            Selected: {selectedParameters.length} parameter(s)
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleQuery}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition flex items-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Loading...
                </>
              ) : (
                'View Data'
              )}
            </button>

            <button
              onClick={handleGeneratePdf}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md transition"
            >
              Generate PDF Report
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Data Table */}
        {historyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">
              Historical Data ({historyData.length} records)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    {selectedParameters.map((param) => (
                      <th
                        key={param}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {availableParameters[param] || param}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.map((dataPoint, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(dataPoint.timestamp)}
                      </td>
                      {selectedParameters.map((param) => (
                        <td
                          key={param}
                          className="px-4 py-3 whitespace-nowrap text-sm text-gray-700"
                        >
                          {formatValue(dataPoint.parameters[param])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
