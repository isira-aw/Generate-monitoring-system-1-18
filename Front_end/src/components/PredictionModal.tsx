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

export default function PredictionModal({
  isOpen,
  onClose,
  deviceId,
}: PredictionModalProps) {
  const [predictionData, setPredictionData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) fetchPredictionData();
  }, [isOpen, deviceId]);

  const fetchPredictionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(
        `${apiUrl}/api/predictions/${deviceId}`
      );
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setPredictionData(data);
    } catch {
      setError('Failed to load prediction data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const createChartOptions = (color: string): ApexOptions => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100],
      },
    },
    colors: [color],
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#64748b' } },
    },
    yaxis: {
      labels: {
        style: { colors: '#64748b' },
        formatter: (v) => `${v.toFixed(0)}%`,
      },
    },
    grid: { borderColor: '#f1f5f9' },
    tooltip: {
      theme: 'light',
      x: { format: 'dd MMM HH:mm' },
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* ================= HEADER ================= */}
        <div className="px-8 py-5 bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <span className="p-2 bg-indigo-50 rounded-lg">
                ⚡
              </span>
              AI Runtime Insights
            </h2>
            <p className="text-sm text-slate-500 ml-12">
              Device:{' '}
              <span className="font-mono font-medium text-slate-700">
                {deviceId}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400"
          >
            ✕
          </button>
        </div>

        {/* ================= CONTENT ================= */}
        <div className="flex-1 overflow-y-auto px-8 py-10 bg-slate-50/50">
          {loading && (
            <div className="py-24 text-center">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
              <p className="mt-4 text-slate-500 font-medium">
                Analyzing historical trends…
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl">
              {error}
            </div>
          )}

          {predictionData && !loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PredictionSection
                title="Fuel Level"
                color="#f59e0b"
                data={predictionData.fuelPrediction}
                valueKey="currentLevel"
                chartOptions={createChartOptions('#f59e0b')}
              />

              <PredictionSection
                title="Battery SOC"
                color="#10b981"
                data={predictionData.batteryPrediction}
                valueKey="currentSoc"
                chartOptions={createChartOptions('#10b981')}
              />
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-8 py-4 bg-white border-t border-slate-100 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] flex justify-end gap-3">
          <button
            onClick={fetchPredictionData}
            className="px-5 py-2.5 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
          >
            Refresh Data
          </button>
          <button
            onClick={onClose}
            className="px-8 py-2.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= SUB COMPONENT ================= */

function PredictionSection({
  title,
  data,
  color,
  valueKey,
  chartOptions,
}: any) {
  const formatRuntime = (hours: number | null) => {
    if (hours == null) return 'N/A';
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return h ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
        <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
          {title} Prediction
        </span>
      </div>

      <div className="p-6 flex-1">
        {!data?.hasEnoughData ? (
          <div className="h-full flex items-center justify-center border border-dashed rounded-xl text-slate-500 text-sm">
            {data?.message}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-slate-400">
                  Current
                </p>
                <p className="text-2xl font-black text-slate-800">
                  {data[valueKey]?.toFixed(1)}%
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50">
                <p className="text-[10px] uppercase font-bold text-indigo-400">
                  Est. Runtime
                </p>
                <p className="text-2xl font-black text-indigo-700">
                  {formatRuntime(data.predictedRuntimeHours)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400">
                Estimated depletion at
              </p>
              <p className="font-bold text-slate-700 text-sm">
                {data.estimatedEmptyTime
                  ? new Date(
                      data.estimatedEmptyTime
                    ).toLocaleString()
                  : 'N/A'}
              </p>
            </div>

            <div className="h-64 pt-2">
              <Chart
                options={chartOptions}
                series={[
                  {
                    name: title,
                    data: data.historicalData.map((p: any) => ({
                      x: new Date(p.timestamp).getTime(),
                      y: p.value,
                    })),
                  },
                ]}
                type="area"
                height="100%"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
