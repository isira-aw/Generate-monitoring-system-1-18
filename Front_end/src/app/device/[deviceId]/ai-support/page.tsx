'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { deviceApi } from '@/lib/api';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface RuntimePrediction {
  id: number;
  predictedAt: string;
  predictedRuntimeHours: number;
  predictedDepletionTime: string;
  confidenceScore: number;
  rawRuntimeHours: number;
  correctionFactor: number;
  type: string;
  fuelLevelPercent?: number;
  fuelBurnRateLh?: number;
  batteryVoltage?: number;
  batteryDrainRateVh?: number;
  avgLoadKw?: number;
}

interface AccuracyMetrics {
  generatorCorrectionFactor: number;
  batteryCorrectionFactor: number;
  generatorAvgErrorPercent: number;
  batteryAvgErrorPercent: number;
  generatorPredictionCount: number;
  batteryPredictionCount: number;
  generatorActualEventCount: number;
  batteryActualEventCount: number;
}

interface PredictionResponse {
  generator: RuntimePrediction | null;
  battery: RuntimePrediction | null;
  generatorMessage?: string;
  batteryMessage?: string;
  accuracyMetrics?: AccuracyMetrics;
}

export default function AISupportPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;

  const [predictions, setPredictions] = useState<PredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadPredictions();

    // Auto-refresh every 60 seconds
    if (autoRefresh) {
      const interval = setInterval(loadPredictions, 60000);
      return () => clearInterval(interval);
    }
  }, [deviceId, autoRefresh]);

  const loadPredictions = async () => {
    try {
      setError(null);
      const response = await fetch(`http://localhost:8080/api/predictions/${deviceId}/runtime`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load predictions');
      }

      const data = await response.json();
      setPredictions(data);
    } catch (err: any) {
      console.error('Failed to load predictions:', err);
      setError(err.message || 'Failed to load predictions');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number | undefined): string => {
    if (!hours || hours <= 0) return 'N/A';

    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);

    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatDateTime = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.85) return 'text-green-600';
    if (confidence >= 0.70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.85) return 'High Confidence';
    if (confidence >= 0.70) return 'Medium Confidence';
    return 'Low Confidence';
  };

  // Chart configuration for Generator Runtime
  const generatorChartOptions: any = {
    chart: {
      type: 'area',
      height: 250,
      toolbar: { show: false },
      animations: { enabled: true },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.6,
        opacityTo: 0.1,
      },
    },
    xaxis: {
      categories: ['Now', 'Predicted Depletion'],
      labels: { style: { colors: '#6b7280' } },
    },
    yaxis: {
      title: { text: 'Fuel Level (%)' },
      labels: { style: { colors: '#6b7280' } },
    },
    colors: ['#FF7F00'],
    tooltip: {
      y: { formatter: (val: number) => `${val.toFixed(1)}%` },
    },
  };

  const generatorChartSeries = predictions?.generator
    ? [
        {
          name: 'Fuel Level',
          data: [
            predictions.generator.fuelLevelPercent || 0,
            0, // Depletion point
          ],
        },
      ]
    : [];

  // Chart configuration for Battery Runtime
  const batteryChartOptions: any = {
    chart: {
      type: 'area',
      height: 250,
      toolbar: { show: false },
      animations: { enabled: true },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.6,
        opacityTo: 0.1,
      },
    },
    xaxis: {
      categories: ['Now', 'Predicted Depletion'],
      labels: { style: { colors: '#6b7280' } },
    },
    yaxis: {
      title: { text: 'Battery Voltage (V)' },
      labels: { style: { colors: '#6b7280' } },
    },
    colors: ['#3B82F6'],
    tooltip: {
      y: { formatter: (val: number) => `${val.toFixed(2)}V` },
    },
  };

  const batteryChartSeries = predictions?.battery
    ? [
        {
          name: 'Battery Voltage',
          data: [
            predictions.battery.batteryVoltage || 0,
            predictions.battery.batteryVoltage! - (predictions.battery.batteryDrainRateVh! * predictions.battery.predictedRuntimeHours),
          ],
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading predictions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <ArrowLeftIcon className="w-6 h-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI Runtime Predictions</h1>
              <p className="text-gray-600 mt-1">Generator & Battery Runtime Forecast</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span>Auto-refresh (60s)</span>
            </label>
            <button
              onClick={loadPredictions}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Refresh Now
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator Runtime Prediction */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Generator Runtime</h2>
            {predictions?.generator && (
              <span className={`text-sm font-semibold ${getConfidenceColor(predictions.generator.confidenceScore)}`}>
                {getConfidenceLabel(predictions.generator.confidenceScore)} ({(predictions.generator.confidenceScore * 100).toFixed(0)}%)
              </span>
            )}
          </div>

          {predictions?.generator ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Remaining Runtime</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatHours(predictions.generator.predictedRuntimeHours)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Predicted Depletion</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {formatDateTime(predictions.generator.predictedDepletionTime)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <Chart
                  options={generatorChartOptions}
                  series={generatorChartSeries}
                  type="area"
                  height={250}
                />
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Current Fuel Level:</span>
                  <span className="font-semibold">{predictions.generator.fuelLevelPercent?.toFixed(1)}%</span>
                </div>
                {predictions.generator.fuelBurnRateLh ? (
                  <div className="flex justify-between">
                    <span>Fuel Burn Rate:</span>
                    <span className="font-semibold">{predictions.generator.fuelBurnRateLh.toFixed(2)} L/h</span>
                  </div>
                ) : (
                  <div className="flex justify-between">
                    <span>Calculation Method:</span>
                    <span className="font-semibold text-blue-600">Percentage-based</span>
                  </div>
                )}
                {predictions.generator.avgLoadKw && (
                  <div className="flex justify-between">
                    <span>Average Load:</span>
                    <span className="font-semibold">{predictions.generator.avgLoadKw.toFixed(1)} kW</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>AI Correction Factor:</span>
                  <span className="font-semibold">{predictions.generator.correctionFactor.toFixed(3)}x</span>
                </div>
                {!predictions.generator.fuelBurnRateLh && (
                  <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
                    Using efficiency-based calculation. Configure tank capacity in settings for more detailed metrics.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">{predictions?.generatorMessage || 'No prediction available'}</p>
              <p className="text-sm text-gray-400 mt-2">Ensure device is sending telemetry data</p>
            </div>
          )}
        </div>

        {/* Battery Runtime Prediction */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Battery Runtime</h2>
            {predictions?.battery && (
              <span className={`text-sm font-semibold ${getConfidenceColor(predictions.battery.confidenceScore)}`}>
                {getConfidenceLabel(predictions.battery.confidenceScore)} ({(predictions.battery.confidenceScore * 100).toFixed(0)}%)
              </span>
            )}
          </div>

          {predictions?.battery ? (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Remaining Runtime</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatHours(predictions.battery.predictedRuntimeHours)}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600">Predicted Depletion</p>
                  <p className="text-lg font-semibold text-gray-700">
                    {formatDateTime(predictions.battery.predictedDepletionTime)}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <Chart
                  options={batteryChartOptions}
                  series={batteryChartSeries}
                  type="area"
                  height={250}
                />
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Current Voltage:</span>
                  <span className="font-semibold">{predictions.battery.batteryVoltage?.toFixed(2)}V</span>
                </div>
                <div className="flex justify-between">
                  <span>Battery Drain Rate:</span>
                  <span className="font-semibold">{predictions.battery.batteryDrainRateVh?.toFixed(3)} V/h</span>
                </div>
                {predictions.battery.avgLoadKw && (
                  <div className="flex justify-between">
                    <span>Average Load:</span>
                    <span className="font-semibold">{predictions.battery.avgLoadKw.toFixed(1)} kW</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>AI Correction Factor:</span>
                  <span className="font-semibold">{predictions.battery.correctionFactor.toFixed(3)}x</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">{predictions?.batteryMessage || 'No prediction available'}</p>
              <p className="text-sm text-gray-400 mt-2">Battery may be charging or insufficient data</p>
            </div>
          )}
        </div>
      </div>

      {/* AI Learning Metrics */}
      {predictions?.accuracyMetrics && (
        <div className="max-w-7xl mx-auto mt-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">AI Learning Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Generator Predictions</p>
                <p className="text-2xl font-bold text-orange-600">{predictions.accuracyMetrics.generatorPredictionCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Generator Events</p>
                <p className="text-2xl font-bold text-orange-600">{predictions.accuracyMetrics.generatorActualEventCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Battery Predictions</p>
                <p className="text-2xl font-bold text-blue-600">{predictions.accuracyMetrics.batteryPredictionCount}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Battery Events</p>
                <p className="text-2xl font-bold text-blue-600">{predictions.accuracyMetrics.batteryActualEventCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
