'use client';

import { useState, useEffect, useRef } from 'react';
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

// Declare ApexCharts type for TypeScript
declare const ApexCharts: any;

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

  const chart1Ref = useRef<any>(null);
  const chart2Ref = useRef<any>(null);
  const apexChartsLoadedRef = useRef(false);

  useEffect(() => {
    loadDeviceInfo();
    loadParameters();

    // Load ApexCharts script
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.async = true;
    script.onload = () => {
      apexChartsLoadedRef.current = true;
    };
    document.head.appendChild(script);

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

    return () => {
      // Cleanup charts on unmount
      if (chart1Ref.current) {
        chart1Ref.current.destroy();
      }
      if (chart2Ref.current) {
        chart2Ref.current.destroy();
      }
    };
  }, [deviceId]);

  useEffect(() => {
    if (chartData.length > 0 && apexChartsLoadedRef.current) {
      renderCharts();
    }
  }, [chartData]);

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

  const renderCharts = () => {
    // Destroy existing charts
    if (chart1Ref.current) {
      chart1Ref.current.destroy();
    }
    if (chart2Ref.current) {
      chart2Ref.current.destroy();
    }

    // Process data with time gap filling
    const processedData = fillTimeGaps(chartData);

    // Prepare data for ApexCharts
    const seriesData = processedData.map(point => [
      new Date(point.timestamp).getTime(),
      point.rpm
    ]);

    // Main area chart options
    const options1 = {
      chart: {
        id: 'chart2',
        type: 'area',
        height: 350,
        foreColor: '#6b7280',
        toolbar: {
          autoSelected: 'pan',
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
      colors: ['#3b82f6'],
      stroke: {
        width: 3,
        curve: 'smooth'
      },
      grid: {
        borderColor: '#e5e7eb',
        clipMarkers: false,
        yaxis: {
          lines: {
            show: true
          }
        }
      },
      dataLabels: {
        enabled: false
      },
      fill: {
        gradient: {
          enabled: true,
          opacityFrom: 0.55,
          opacityTo: 0
        }
      },
      markers: {
        size: 0,
        colors: ['#ffffff'],
        strokeColor: '#3b82f6',
        strokeWidth: 2,
        hover: {
          size: 7
        }
      },
      series: [{
        name: 'RPM',
        data: seriesData
      }],
      tooltip: {
        theme: 'light',
        x: {
          formatter: function(value: number) {
            const date = new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          }
        },
        y: {
          formatter: function(value: number) {
            return value.toFixed(2) + ' RPM';
          }
        }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          format: 'HH:mm',
          datetimeUTC: false,
          datetimeFormatter: {
            year: 'yyyy',
            month: 'MMM \'yy',
            day: 'dd MMM',
            hour: 'HH:mm',
            minute: 'HH:mm'
          }
        }
      },
      yaxis: {
        min: 0,
        tickAmount: 4,
        labels: {
          formatter: function(value: number) {
            return value.toFixed(0);
          }
        },
        title: {
          text: 'RPM (Average per Minute)',
          style: {
            color: '#374151',
            fontSize: '14px',
            fontWeight: 600
          }
        }
      },
      annotations: {
        yaxis: [{
          y: 0,
          borderColor: '#ef4444',
          strokeDashArray: 5,
          label: {
            borderColor: '#ef4444',
            style: {
              color: '#fff',
              background: '#ef4444'
            },
            text: 'Zero RPM'
          }
        }]
      }
    };

    // Brush chart options
    const options2 = {
      chart: {
        id: 'chart1',
        height: 130,
        type: 'area',
        foreColor: '#6b7280',
        brush: {
          target: 'chart2',
          enabled: true
        },
        selection: {
          enabled: true,
          fill: {
            color: '#3b82f6',
            opacity: 0.1
          }
        }
      },
      colors: ['#ef4444'],
      series: [{
        name: 'RPM',
        data: seriesData
      }],
      stroke: {
        width: 2
      },
      grid: {
        borderColor: '#e5e7eb'
      },
      markers: {
        size: 0
      },
      xaxis: {
        type: 'datetime',
        labels: {
          format: 'HH:mm',
          datetimeUTC: false
        },
        tooltip: {
          enabled: false
        }
      },
      yaxis: {
        tickAmount: 2,
        labels: {
          formatter: function(value: number) {
            return value.toFixed(0);
          }
        }
      },
      legend: {
        show: false
      }
    };

    // Render charts
    const chartElement1 = document.querySelector('#chart-area');
    const chartElement2 = document.querySelector('#chart-bar');

    if (chartElement1 && chartElement2 && typeof ApexCharts !== 'undefined') {
      chart1Ref.current = new ApexCharts(chartElement1, options1);
      chart2Ref.current = new ApexCharts(chartElement2, options2);

      chart1Ref.current.render();
      chart2Ref.current.render();
    }
  };

  const fillTimeGaps = (data: { timestamp: string; rpm: number }[]) => {
    if (data.length === 0) return data;

    const result: { timestamp: string; rpm: number }[] = [];
    const sortedData = [...data].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 0; i < sortedData.length; i++) {
      result.push(sortedData[i]);

      if (i < sortedData.length - 1) {
        const currentTime = new Date(sortedData[i].timestamp).getTime();
        const nextTime = new Date(sortedData[i + 1].timestamp).getTime();
        const gap = nextTime - currentTime;

        // If gap is greater than 1 minute (60000ms), fill with zeros
        if (gap > 60000) {
          let fillTime = currentTime + 60000;
          while (fillTime < nextTime) {
            result.push({
              timestamp: new Date(fillTime).toISOString(),
              rpm: 0
            });
            fillTime += 60000; // Add 1 minute
          }
        }
      }
    }

    return result;
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
      // Call backend endpoint that returns averaged RPM data
      const data = await historyApi.getRpmChartData(deviceId, selectedDate);
      setChartData(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chart data');
      setChartData([]);
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
    <div className="min-h-screen bg-[#d9d9d9] p-4">
      <br /><br />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md border border-[#1E40AF]/20 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#1E40AF]">Documents and History</h1>
              {device && (
                <p className="text-black/70 mt-2">
                  {device.name} ({device.deviceId})
                </p>
              )}
            </div>
            <button
              onClick={() => router.push(`/device/${deviceId}/dashboard`)}
              className="bg-[#d9d9d9] hover:bg-[#d9d9d9]/80 text-black border border-[#1E40AF]/30 px-4 py-2 rounded-md transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* RPM Area Chart Section - ApexCharts with zero value handling */}
        <div className="bg-white rounded-lg shadow-md border border-[#1E40AF]/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#1E40AF] mb-4">
            RPM Area Chart
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E40AF]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLoadChartData}
                disabled={chartLoading}
                className="bg-[#1E40AF] hover:bg-[#1E40AF]/90 disabled:bg-gray-400 text-[#d9d9d9] px-6 py-2 rounded-md transition flex items-center"
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
              {/* <div className="bg-[#1E40AF]/10 border border-[#1E40AF]/30 p-3 rounded-md mb-4">
                <p className="text-sm text-[#1E40AF]">
                  <strong>📊 Data Points:</strong> {chartData.length} minutes |
                  <strong> Zero Values:</strong> {chartData.filter(d => d.rpm === 0).length} minutes |
                  <strong> Active:</strong> {chartData.filter(d => d.rpm > 0).length} minutes
                </p>
              </div> */}

              {/* ApexCharts Container */}
              <div id="chart-area" className="mb-4"></div>
              <div id="chart-bar"></div>

              {/* Data Table */}
              <div className="mt-6 bg-white border border-[#1E40AF]/20 rounded-lg overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  {/* <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#d9d9d9]/50 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E40AF] uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E40AF] uppercase tracking-wider">
                          Average RPM
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#1E40AF] uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {chartData.map((point, index) => {
                        const time = new Date(point.timestamp);
                        const isZero = point.rpm === 0;

                        // Format time consistently
                        const hours = time.getHours().toString().padStart(2, '0');
                        const minutes = time.getMinutes().toString().padStart(2, '0');
                        const seconds = time.getSeconds().toString().padStart(2, '0');
                        const formattedTime = `${hours}:${minutes}:${seconds}`;

                        return (
                          <tr key={index} className={`hover:bg-[#d9d9d9]/30 ${isZero ? 'bg-red-50' : ''}`}>
                            <td className="px-6 py-2 whitespace-nowrap text-sm text-black">
                              {formattedTime}
                            </td>
                            <td className={`px-6 py-2 whitespace-nowrap text-sm font-medium ${isZero ? 'text-red-600' : 'text-black'}`}>
                              {point.rpm.toFixed(2)}
                            </td>
                            <td className="px-6 py-2 whitespace-nowrap text-sm">
                              {isZero ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                  Zero RPM
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table> */}
                </div>
              </div>
            </div>
          )}

          {chartData.length === 0 && !chartLoading && (
            <div className="mt-6 p-4 bg-[#d9d9d9]/50 rounded-md text-center text-black/70">
              Select a date and click "Load Chart Data" to view the RPM chart
            </div>
          )}
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow-md border border-[#1E40AF]/20 p-6 mb-6">
          <h2 className="text-xl font-semibold text-[#1E40AF] mb-4">Select Time Period</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E40AF]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-black mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-[#1E40AF]/30 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1E40AF]"
              />
            </div>
          </div>
        </div>

        {/* Parameter Selection */}
        <div className="bg-white rounded-lg shadow-md border border-[#1E40AF]/20 p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-[#1E40AF]">Select Parameters</h2>
            <div className="space-x-2">
              <button
                onClick={handleSelectAll}
                className="text-sm text-[#1E40AF] hover:text-[#1E40AF]/80"
              >
                Select All
              </button>
              <span className="text-black/50">|</span>
              <button
                onClick={handleDeselectAll}
                className="text-sm text-[#1E40AF] hover:text-[#1E40AF]/80"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto p-2">
            {Object.entries(availableParameters).map(([key, displayName]) => (
              <label
                key={key}
                className="flex items-center space-x-2 cursor-pointer hover:bg-[#d9d9d9]/30 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedParameters.includes(key)}
                  onChange={() => handleParameterToggle(key)}
                  className="w-4 h-4 text-[#1E40AF] rounded focus:ring-[#1E40AF]"
                />
                <span className="text-sm text-black">{displayName}</span>
              </label>
            ))}
          </div>

          <div className="mt-4 text-sm text-black/70">
            Selected: {selectedParameters.length} parameter(s)
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-md border border-[#1E40AF]/20 p-6 mb-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleQuery}
              disabled={loading}
              className="bg-[#1E40AF] hover:bg-[#1E40AF]/90 disabled:bg-gray-400 text-[#d9d9d9] px-6 py-2 rounded-md transition flex items-center"
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
              className="bg-[#1E40AF]/80 hover:bg-[#1E40AF] disabled:bg-gray-400 text-[#d9d9d9] px-6 py-2 rounded-md transition"
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
          <div className="bg-white rounded-lg shadow-md border border-[#1E40AF]/20 p-6">
            <h2 className="text-xl font-semibold text-[#1E40AF] mb-4">
              Historical Data ({historyData.length} records)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#d9d9d9]/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[#1E40AF] uppercase tracking-wider">
                      Timestamp
                    </th>
                    {selectedParameters.map((param) => (
                      <th
                        key={param}
                        className="px-4 py-3 text-left text-xs font-medium text-[#1E40AF] uppercase tracking-wider"
                      >
                        {availableParameters[param] || param}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {historyData.map((dataPoint, index) => (
                    <tr key={index} className="hover:bg-[#d9d9d9]/30">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-black">
                        {formatTimestamp(dataPoint.timestamp)}
                      </td>
                      {selectedParameters.map((param) => (
                        <td
                          key={param}
                          className="px-4 py-3 whitespace-nowrap text-sm text-black/80"
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
