'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { deviceApi } from '@/lib/api';

interface Threshold {
  id: number;
  parameter: string;
  minValue: number;
  maxValue: number;
  unit: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;
  const { user, loading: authLoading } = useAuth();

  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadThresholds();
    }
  }, [user, deviceId]);

  const loadThresholds = async () => {
    try {
      const data = await deviceApi.getDeviceThresholds(deviceId);
      setThresholds(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load thresholds');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (
    parameter: string,
    minValue: number,
    maxValue: number
  ) => {
    setSaving(parameter);
    setError('');
    setSuccess('');

    try {
      await deviceApi.updateThreshold(deviceId, parameter, minValue, maxValue);
      setSuccess(`${parameter} threshold updated successfully`);
      loadThresholds();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to update threshold');
      }
    } finally {
      setSaving(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Device Settings</h1>
        <p className="text-gray-600">Device ID: {deviceId}</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <div className="card">
        <h2 className="text-2xl font-semibold mb-6">Threshold Configuration</h2>

        <div className="space-y-6">
          {thresholds.map((threshold) => (
            <ThresholdEditor
              key={threshold.id}
              threshold={threshold}
              onUpdate={handleUpdate}
              isSaving={saving === threshold.parameter}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ThresholdEditorProps {
  threshold: Threshold;
  onUpdate: (parameter: string, minValue: number, maxValue: number) => void;
  isSaving: boolean;
}

function ThresholdEditor({
  threshold,
  onUpdate,
  isSaving,
}: ThresholdEditorProps) {
  const [minValue, setMinValue] = useState(threshold.minValue);
  const [maxValue, setMaxValue] = useState(threshold.maxValue);

  useEffect(() => {
    setMinValue(threshold.minValue);
    setMaxValue(threshold.maxValue);
  }, [threshold]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(threshold.parameter, minValue, maxValue);
  };

  const parameterName = threshold.parameter
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ');

  return (
    <form onSubmit={handleSubmit} className="border-b pb-6 last:border-b-0">
      <h3 className="text-lg font-semibold mb-3">{parameterName}</h3>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-gray-700 mb-2">
            Minimum Value ({threshold.unit})
          </label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={minValue}
            onChange={(e) => setMinValue(parseFloat(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2">
            Maximum Value ({threshold.unit})
          </label>
          <input
            type="number"
            step="0.01"
            className="input"
            value={maxValue}
            onChange={(e) => setMaxValue(parseFloat(e.target.value))}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Update Threshold'}
      </button>
    </form>
  );
}
