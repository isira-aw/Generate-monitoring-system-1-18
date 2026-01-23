'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { historyApi, deviceApi } from '@/lib/api';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

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
  const [availableParameters, setAvailableParameters] = useState<Record<string, string>>({});
  const [selectedParameters, setSelectedParameters] = useState<string[]>([]);
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // RPM Chart States - Completely New
  const [showRpmChart, setShowRpmChart] = useState(false);
  const [chartFilterTime, setChartFilterTime] = useState('');
  const [rpmChartData, setRpmChartData] = useState<{ timestamp: number; rpm: number }[]>([]);

  useEffect(() => {
    loadDeviceInfo();
    loadParameters();

    // Set default dates (last 24 hours)
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setEndDate(formatDateTimeLocal(now));
    setStartDate(formatDateTimeLocal(yesterday));
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

  // NEW FUNCTION: Generate RPM Chart from Historical Data
  const handleGenerateRpmChart = () => {
    if (historyData.length === 0) {
      setError('Please query historical data first');
      return;
    }

    // Filter historical data for RPM
    let filteredData = historyData.filter(
      (point: any) => point.parameters.rpm !== null && point.parameters.rpm !== undefined
    );

    // Apply time filter if specified (e.g., "5:00 PM" onwards)
    if (chartFilterTime) {
      const filterDate = new Date(chartFilterTime);
      const filterTimestamp = filterDate.getTime();

      filteredData = filteredData.filter((point: any) => {
        const pointTimestamp = new Date(point.timestamp).getTime();
        return pointTimestamp >= filterTimestamp;
      });
    }

    // Extract RPM and Timestamp, group by minute (one record per minute)
    const minuteMap = new Map<string, { timestamp: number; rpm: number }>();

    filteredData.forEach((point: any) => {
      const timestamp = new Date(point.timestamp);
      const minuteKey = timestamp.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

      // Take first record of each minute
      if (!minuteMap.has(minuteKey)) {
        minuteMap.set(minuteKey, {
          timestamp: timestamp.getTime(),
          rpm: point.parameters.rpm
        });
      }
    });

    // Convert to array and sort
    const chartData = Array.from(minuteMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    setRpmChartData(chartData);
    setShowRpmChart(true);
    setError('');
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

  // NEW: Render RPM Chart with ApexCharts
  useEffect(() => {
    if (rpmChartData.length === 0 || !showRpmChart || typeof window === 'undefined') return;

    // Clear previous chart
    const chartEl = document.querySelector('#rpm-area-chart');
    if (chartEl) chartEl.innerHTML = '';

    // Prepare data for chart
    const seriesData = rpmChartData.map(point => [point.timestamp, point.rpm]);

    // Chart configuration
    const options: any = {
      series: [{
        name: 'RPM',
        data: seriesData
      }],
      chart: {
        type: 'area',
        height: 400,
        background: '#F6F8FA',
        toolbar: {
          show: true,
          tools: {
            download: true,
            selection: true,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true
          }
        }
      },
      colors: ['#FF7F00'],
      stroke: {
        width: 2,
        curve: 'smooth'
      },
      dataLabels: {
        enabled: false
      },
      fill: {
        opacity: 0.5,
        type: 'solid'
      },
      markers: {
        size: 3,
        hover: {
          size: 5
        }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          format: 'hh:mm tt',
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM \'yy',
            day: 'dd MMM',
            hour: 'hh:mm tt'
          }
        }
      },
      yaxis: {
        title: {
          text: 'RPM Value'
        },
        forceNiceScale: true
      },
      tooltip: {
        x: {
          format: 'MMM dd, yyyy hh:mm:ss tt'
        },
        y: {
          formatter: (value: number) => value.toFixed(2)
        }
      },
      grid: {
        borderColor: '#e7e7e7',
        row: {
          colors: ['#f3f3f3', 'transparent'],
          opacity: 0.5
        }
      }
    };

    // Render chart
    import('apexcharts').then((ApexChartsModule) => {
      const ApexCharts = ApexChartsModule.default;
      if (chartEl) {
        const chart = new ApexCharts(chartEl, options);
        chart.render();
      }
    });
  }, [rpmChartData, showRpmChart]);

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

        {/* NEW RPM AREA CHART SECTION */}
        {historyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">RPM Area Chart</h2>
            <p className="text-sm text-gray-600 mb-4">
              Generate RPM chart from the historical data above. Optionally filter by start time.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Start Time (Optional - e.g., show from 5:00 PM onwards)
                </label>
                <input
                  type="datetime-local"
                  value={chartFilterTime}
                  onChange={(e) => setChartFilterTime(e.target.value)}
                  placeholder="Leave empty for all data"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to show all data, or select a time to show data from that time onwards
                </p>
              </div>
              <div className="flex items-end gap-2">
                <button
                  onClick={handleGenerateRpmChart}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-md transition"
                >
                  Generate Chart
                </button>
                {showRpmChart && (
                  <button
                    onClick={() => {
                      setShowRpmChart(false);
                      setRpmChartData([]);
                      setChartFilterTime('');
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {showRpmChart && rpmChartData.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Chart Info:</strong> Showing {rpmChartData.length} data points (one record per minute)
                    {chartFilterTime && ` from ${new Date(chartFilterTime).toLocaleString()} onwards`}
                  </p>
                </div>
                <div id="rpm-area-chart"></div>
              </div>
            )}

            {showRpmChart && rpmChartData.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800">
                  No RPM data available for the selected filter. Try adjusting the time filter or query more data.
                </p>
              </div>
            )}
          </div>
        )}

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
