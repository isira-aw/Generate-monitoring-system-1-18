'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface RuntimePrediction {
  timestamp: number;
  ruleBasedRuntime: number;
  aiCorrectedRuntime: number;
  confidence: number;
}

interface BatteryPrediction {
  timestamp: number;
  ruleBasedDrain: number;
  aiCorrectedDrain: number;
  confidence: number;
}

interface PredictionData {
  fuelPredictions: RuntimePrediction[];
  batteryPredictions: BatteryPrediction[];
  currentFuelLevel: number;
  currentBatteryVoltage: number;
  currentLoad: number;
  lastUpdated: string;
}

export default function AISupportPage() {
  const params = useParams();
  const deviceId = params.deviceId as string;
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [deviceId]);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/ai/predictions/${deviceId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch predictions');
      }

      const data = await response.json();
      setPredictionData(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fuelChartOptions = {
    chart: {
      id: 'fuel-runtime',
      toolbar: { show: true },
      animations: { enabled: true },
    },
    xaxis: {
      type: 'datetime' as const,
      title: { text: 'Time' },
    },
    yaxis: {
      title: { text: 'Runtime (hours)' },
      min: 0,
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3,
    },
    colors: ['#3b82f6', '#10b981'],
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      x: { format: 'HH:mm:ss' },
    },
  };

  const fuelChartSeries = predictionData
    ? [
        {
          name: 'Rule-Based Runtime',
          data: predictionData.fuelPredictions.map((p) => ({
            x: p.timestamp,
            y: p.ruleBasedRuntime,
          })),
        },
        {
          name: 'AI-Corrected Runtime',
          data: predictionData.fuelPredictions.map((p) => ({
            x: p.timestamp,
            y: p.aiCorrectedRuntime,
          })),
        },
      ]
    : [];

  const batteryChartOptions = {
    chart: {
      id: 'battery-drain',
      toolbar: { show: true },
      animations: { enabled: true },
    },
    xaxis: {
      type: 'datetime' as const,
      title: { text: 'Time' },
    },
    yaxis: {
      title: { text: 'Battery Drain Time (hours)' },
      min: 0,
    },
    stroke: {
      curve: 'smooth' as const,
      width: 3,
    },
    colors: ['#f59e0b', '#8b5cf6'],
    legend: {
      position: 'top' as const,
    },
    tooltip: {
      x: { format: 'HH:mm:ss' },
    },
  };

  const batteryChartSeries = predictionData
    ? [
        {
          name: 'Rule-Based Drain Time',
          data: predictionData.batteryPredictions.map((p) => ({
            x: p.timestamp,
            y: p.ruleBasedDrain,
          })),
        },
        {
          name: 'AI-Corrected Drain Time',
          data: predictionData.batteryPredictions.map((p) => ({
            x: p.timestamp,
            y: p.aiCorrectedDrain,
          })),
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Prediction System</h1>
          <p className="text-gray-600">Device ID: {deviceId}</p>
          {predictionData && (
            <p className="text-sm text-gray-500">Last updated: {new Date(predictionData.lastUpdated).toLocaleString()}</p>
          )}
        </div>

        {loading && !predictionData && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">Error loading predictions</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {predictionData && (
          <>
            {/* Current Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Current Fuel Level</h3>
                <p className="text-3xl font-bold text-blue-600">{predictionData.currentFuelLevel.toFixed(1)}%</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Current Battery Voltage</h3>
                <p className="text-3xl font-bold text-green-600">{predictionData.currentBatteryVoltage.toFixed(2)}V</p>
              </div>
              <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Current Load</h3>
                <p className="text-3xl font-bold text-orange-600">{predictionData.currentLoad.toFixed(2)} kW</p>
              </div>
            </div>

            {/* Fuel Runtime Prediction Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Generator Fuel Runtime Prediction
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Predicting generator runtime based on current fuel level and load consumption patterns
              </p>
              {fuelChartSeries.length > 0 && (
                <Chart
                  options={fuelChartOptions}
                  series={fuelChartSeries}
                  type="line"
                  height={350}
                />
              )}
              {predictionData.fuelPredictions.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900">
                    Latest Prediction: {predictionData.fuelPredictions[predictionData.fuelPredictions.length - 1].aiCorrectedRuntime.toFixed(2)} hours
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Confidence: {(predictionData.fuelPredictions[predictionData.fuelPredictions.length - 1].confidence * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Battery Drain Prediction Chart */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Battery Drain Time Prediction
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Predicting battery drain time for DC/Starter/UPS batteries based on current voltage and usage patterns
              </p>
              {batteryChartSeries.length > 0 && (
                <Chart
                  options={batteryChartOptions}
                  series={batteryChartSeries}
                  type="line"
                  height={350}
                />
              )}
              {predictionData.batteryPredictions.length > 0 && (
                <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm font-semibold text-purple-900">
                    Latest Prediction: {predictionData.batteryPredictions[predictionData.batteryPredictions.length - 1].aiCorrectedDrain.toFixed(2)} hours
                  </p>
                  <p className="text-xs text-purple-700 mt-1">
                    Confidence: {(predictionData.batteryPredictions[predictionData.batteryPredictions.length - 1].confidence * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Information Section */}
            <div className="mt-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">How It Works</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div>
                  <h4 className="font-semibold text-purple-900 mb-2">Fuel Runtime Prediction</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Analyzes historical fuel consumption patterns</li>
                    <li>Considers current load and generator efficiency</li>
                    <li>AI model learns from actual runtime data</li>
                    <li>Self-correcting based on real-world performance</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-blue-900 mb-2">Battery Drain Prediction</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Monitors battery voltage trends over time</li>
                    <li>Accounts for battery age and health</li>
                    <li>Predicts drain time under current load</li>
                    <li>Learns from charging/discharging cycles</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
