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

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts';
    script.async = true;
    script.onload = () => {
      apexChartsLoadedRef.current = true;
    };
    document.head.appendChild(script);

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    setEndDate(formatDateTimeLocal(now));
    setStartDate(formatDateTimeLocal(yesterday));

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);

    return () => {
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
    if (chart1Ref.current) {
      chart1Ref.current.destroy();
    }
    if (chart2Ref.current) {
      chart2Ref.current.destroy();
    }

    const processedData = fillTimeGaps(chartData);
    const seriesData = processedData.map(point => [
      new Date(point.timestamp).getTime(),
      point.rpm
    ]);

    const options1 = {
      chart: {
        id: 'chart2',
        type: 'area',
        height: 350,
        foreColor: '#1E40AF',
        toolbar: {
          autoSelected: 'pan',
          show: true,
          tools: {
            download: true, selection: true, zoom: true, zoomin: true, zoomout: true, pan: true, reset: true
          }
        }
      },
      colors: ['#1E40AF'],
      stroke: { width: 3, curve: 'smooth' },
      grid: {
        borderColor: '#e5e7eb',
        clipMarkers: false,
        yaxis: { lines: { show: true } }
      },
      dataLabels: { enabled: false },
      fill: {
        gradient: { enabled: true, opacityFrom: 0.55, opacityTo: 0 }
      },
      markers: {
        size: 0,
        colors: ['#ffffff'],
        strokeColor: '#1E40AF',
        strokeWidth: 2,
        hover: { size: 7 }
      },
      series: [{ name: 'RPM', data: seriesData }],
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
            return `${year}-${month}-${day} ${hours}:${minutes}`;
          }
        },
        y: { formatter: function(value: number) { return value.toFixed(2) + ' RPM'; } }
      },
      xaxis: {
        type: 'datetime',
        labels: { format: 'HH:mm', datetimeUTC: false }
      },
      yaxis: {
        min: 0,
        tickAmount: 4,
        labels: { formatter: function(value: number) { return value.toFixed(0); } },
        title: { text: 'RPM (Average per Minute)', style: { color: '#1E40AF', fontSize: '14px', fontWeight: 600 } }
      },
      annotations: {
        yaxis: [{
          y: 0,
          borderColor: '#ef4444',
          strokeDashArray: 5,
          label: { borderColor: '#ef4444', style: { color: '#ffffff', background: '#ef4444' }, text: 'Zero RPM' }
        }]
      }
    };

    const options2 = {
      chart: {
        id: 'chart1',
        height: 130,
        type: 'area',
        foreColor: '#1E40AF',
        brush: { target: 'chart2', enabled: true },
        selection: { enabled: true, fill: { color: '#1E40AF', opacity: 0.1 } }
      },
      colors: ['#1E40AF'],
      series: [{ name: 'RPM', data: seriesData }],
      stroke: { width: 2 },
      grid: { borderColor: '#e5e7eb' },
      markers: { size: 0 },
      xaxis: {
        type: 'datetime',
        labels: { format: 'HH:mm', datetimeUTC: false },
        tooltip: { enabled: false }
      },
      yaxis: { tickAmount: 2, labels: { formatter: function(value: number) { return value.toFixed(0); } } },
      legend: { show: false }
    };

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
    const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (let i = 0; i < sortedData.length; i++) {
      result.push(sortedData[i]);
      if (i < sortedData.length - 1) {
        const currentTime = new Date(sortedData[i].timestamp).getTime();
        const nextTime = new Date(sortedData[i + 1].timestamp).getTime();
        const gap = nextTime - currentTime;
        if (gap > 60000) {
          let fillTime = currentTime + 60000;
          while (fillTime < nextTime) {
            result.push({ timestamp: new Date(fillTime).toISOString(), rpm: 0 });
            fillTime += 60000;
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

  const handleLoadChartData = async () => {
    if (!selectedDate) {
      setError('Please select a date');
      return;
    }
    setChartLoading(true);
    setError('');
    try {
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
      const data = await historyApi.queryHistory({ deviceId, startTime, endTime, parameters: selectedParameters });
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
      const blob = await historyApi.generatePdfReport({ deviceId, startTime, endTime, parameters: selectedParameters });
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

  return (
    <div className="min-h-screen bg-[#d9d9d9] p-4">
      <br /><br />
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#1E40AF]">Documents and History</h1>
              {device && (
                <p className="text-gray-600 mt-2">{device.name} ({device.deviceId})</p>
              )}
            </div>
            <button
              onClick={() => router.push(`/device/${deviceId}/dashboard`)}
              className="bg-[#1E40AF] hover:bg-blue-700 text-white px-4 py-2 rounded-md transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-[#1E40AF] mb-4">RPM Chart</h2>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">Select Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
              />
            </div>
            <button
              onClick={handleLoadChartData}
              disabled={chartLoading}
              className="w-full bg-[#1E40AF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              {chartLoading ? 'Loading...' : 'Load Chart Data'}
            </button>
            <div id="chart-area" className="mt-4" />
            <div id="chart-bar" className="mt-2" />
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-[#1E40AF] mb-4">Parameters</h2>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">Select Parameters</label>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded p-2">
                {Object.entries(availableParameters).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 py-1 text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedParameters.includes(key)}
                      onChange={() => handleParameterToggle(key)}
                      className="rounded text-[#1E40AF] focus:ring-[#1E40AF]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              <button onClick={() => setSelectedParameters(Object.keys(availableParameters))} className="flex-1 bg-gray-100 text-[#1E40AF] py-2 rounded-lg font-medium hover:bg-gray-200">
                Select All
              </button>
              <button onClick={() => setSelectedParameters([])} className="flex-1 bg-gray-100 text-[#1E40AF] py-2 rounded-lg font-medium hover:bg-gray-200">
                Deselect All
              </button>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">Start Date/Time</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2 font-medium">End Date/Time</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleQuery} disabled={loading} className="flex-1 bg-[#1E40AF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                {loading ? 'Loading...' : 'Query Data'}
              </button>
              <button onClick={handleGeneratePdf} disabled={loading} className="flex-1 bg-[#1E40AF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Generate PDF
              </button>
            </div>
          </div>
        </div>

        {historyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h2 className="text-xl font-bold text-[#1E40AF] mb-4">Historical Data</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-gray-700">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-semibold text-[#1E40AF]">Timestamp</th>
                    {selectedParameters.map(param => (
                      <th key={param} className="text-left py-2 px-2 font-semibold text-[#1E40AF]">{availableParameters[param] || param}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((point, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2">{new Date(point.timestamp).toLocaleString()}</td>
                      {selectedParameters.map(param => (
                        <td key={param} className="py-2 px-2">{formatValue(point.parameters[param])}</td>
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
