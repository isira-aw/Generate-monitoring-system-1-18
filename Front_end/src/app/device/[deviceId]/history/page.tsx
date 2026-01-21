'use client';

import { useState, useEffect, useMemo } from 'react';
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

type SortDirection = 'asc' | 'desc' | null;

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

  // Filtering and sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [recordLimit, setRecordLimit] = useState<number | null>(null);

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

  // Calculate estimated record count based on time range
  const getEstimatedRecordCount = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const hours = (end - start) / (1000 * 60 * 60);
    return Math.floor(hours * 3600); // Assuming 1 record per second
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

    // Check if time range is too large
    const estimatedRecords = getEstimatedRecordCount();
    if (estimatedRecords > 50000) {
      setError('Time range too large! Expected ' + estimatedRecords.toLocaleString() + ' records. Please select a shorter period (< 14 hours recommended).');
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
      setRecordLimit(null);

      // Show warnings for large datasets
      if (data.length > 10000) {
        setError(`Warning: Large dataset (${data.length.toLocaleString()} records). Table may be slow. Consider narrowing your search.`);
      } else if (data.length > 5000) {
        setError(`Note: Retrieved ${data.length.toLocaleString()} records. PDF generation may be slow.`);
      }
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

    // Check if dataset is too large for PDF
    if (historyData.length > 5000) {
      const confirmed = window.confirm(
        `Warning: You have ${historyData.length.toLocaleString()} records. ` +
        `PDF generation may take 30+ seconds and produce a large file. ` +
        `Recommended: < 1,000 records for optimal performance.\n\n` +
        `Continue anyway?`
      );
      if (!confirmed) return;
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

  // Sorting handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Toggle sort direction
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortDirection(null);
        setSortColumn(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Filtered and sorted data
  const filteredAndSortedData = useMemo(() => {
    let result = [...historyData];

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((dataPoint) => {
        // Search in timestamp
        if (formatTimestamp(dataPoint.timestamp).toLowerCase().includes(lowerSearch)) {
          return true;
        }
        // Search in parameter values
        return selectedParameters.some((param) => {
          const value = formatValue(dataPoint.parameters[param]);
          return value.toLowerCase().includes(lowerSearch);
        });
      });
    }

    // Apply sorting
    if (sortColumn && sortDirection) {
      result.sort((a, b) => {
        let aValue, bValue;

        if (sortColumn === 'timestamp') {
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
        } else {
          aValue = a.parameters[sortColumn];
          bValue = b.parameters[sortColumn];

          // Handle null/undefined values
          if (aValue === null || aValue === undefined) aValue = -Infinity;
          if (bValue === null || bValue === undefined) bValue = -Infinity;

          // Convert to numbers if possible
          if (typeof aValue === 'number' && typeof bValue === 'number') {
            // Already numbers
          } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            aValue = aValue ? 1 : 0;
            bValue = bValue ? 1 : 0;
          } else {
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
          }
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply record limit if set
    if (recordLimit && recordLimit > 0) {
      result = result.slice(0, recordLimit);
    }

    return result;
  }, [historyData, searchTerm, sortColumn, sortDirection, selectedParameters, recordLimit]);

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
            <div className={`mt-4 p-3 rounded ${
              error.startsWith('Warning') || error.startsWith('Note')
                ? 'bg-yellow-100 border border-yellow-400 text-yellow-800'
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {error}
            </div>
          )}
        </div>

        {/* Data Table */}
        {historyData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                Historical Data
              </h2>
              <div className="text-sm text-gray-600">
                Showing {filteredAndSortedData.length.toLocaleString()} of {historyData.length.toLocaleString()} records
              </div>
            </div>

            {/* Filter Controls */}
            <div className="mb-4 flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search / Filter
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search in all columns..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Record Limit */}
              <div className="w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Limit
                </label>
                <select
                  value={recordLimit || ''}
                  onChange={(e) => setRecordLimit(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Records</option>
                  <option value="100">100 records</option>
                  <option value="500">500 records</option>
                  <option value="1000">1,000 records</option>
                  <option value="5000">5,000 records</option>
                </select>
              </div>

              {/* Clear Filters */}
              {(searchTerm || sortColumn || recordLimit) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSortColumn(null);
                    setSortDirection(null);
                    setRecordLimit(null);
                  }}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort('timestamp')}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Timestamp</span>
                        {sortColumn === 'timestamp' && (
                          <span className="text-blue-600">
                            {sortDirection === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    {selectedParameters.map((param) => (
                      <th
                        key={param}
                        onClick={() => handleSort(param)}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      >
                        <div className="flex items-center space-x-1">
                          <span>{availableParameters[param] || param}</span>
                          {sortColumn === param && (
                            <span className="text-blue-600">
                              {sortDirection === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={selectedParameters.length + 1}
                        className="px-4 py-8 text-center text-gray-500"
                      >
                        No records match your filter criteria
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedData.map((dataPoint, index) => (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Performance Tip */}
            {historyData.length > 1000 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <strong>💡 Tip:</strong> Use the search filter or display limit to improve table performance with large datasets.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
