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

interface Device {
  id: number;
  deviceId: string;
  name: string;
  location: string;
  active: boolean;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const deviceIdString = params.deviceId as string;
  const { user, loading: authLoading } = useAuth();

  const [device, setDevice] = useState<Device | null>(null);
  const [verified, setVerified] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newDevicePassword, setNewDevicePassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadDeviceInfo();
    }
  }, [user, deviceIdString]);

  const loadDeviceInfo = async () => {
    try {
      const deviceData = await deviceApi.getDeviceDashboard(deviceIdString);
      setDevice(deviceData);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load device information');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadThresholds = async () => {
    try {
      const data = await deviceApi.getDeviceThresholds(deviceIdString);
      setThresholds(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load thresholds');
      }
    }
  };

  const handleRequestVerification = async () => {
    if (!device) return;

    setVerificationError('');
    setSendingCode(true);

    try {
      await deviceApi.requestDeviceVerification(device.id);
      alert('A verification code has been sent to your email');
    } catch (err: any) {
      setVerificationError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    setVerificationError('');
    setVerifying(true);

    try {
      const response = await deviceApi.verifyDeviceCode(device.id, verificationCode);
      if (response.verified) {
        setVerified(true);
        loadThresholds();
      } else {
        setVerificationError('Invalid or expired verification code');
      }
    } catch (err: any) {
      setVerificationError(err.response?.data?.message || 'Verification failed');
    } finally {
      setVerifying(false);
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
      await deviceApi.updateThreshold(deviceIdString, parameter, minValue, maxValue);
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

  const handleUpdateDevicePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    setPasswordError('');
    setPasswordSuccess('');
    setUpdatingPassword(true);

    try {
      await deviceApi.updateDevicePassword(device.id, newDevicePassword);
      setPasswordSuccess('Device password updated successfully');
      setNewDevicePassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to update device password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user || !device) {
    return null;
  }

  // Show verification modal if not verified
  if (!verified) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          <div className="card">
            <h1 className="text-3xl font-bold mb-6 text-center">Verify Access</h1>

            <p className="text-gray-600 mb-6 text-center">
              For security, please verify your identity with a code sent to your email before accessing device settings.
            </p>

            {verificationError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {verificationError}
              </div>
            )}

            <button
              onClick={handleRequestVerification}
              className="btn btn-primary w-full mb-4"
              disabled={sendingCode}
            >
              {sendingCode ? 'Sending...' : 'Send Verification Code'}
            </button>

            <form onSubmit={handleVerifyCode}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2" htmlFor="code">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  className="input"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 4-digit code"
                  maxLength={4}
                  pattern="[0-9]{4}"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={verifying}
              >
                {verifying ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => router.back()}
                className="text-primary hover:underline"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show settings page after verification
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">Device Settings</h1>
        <p className="text-gray-600">Device ID: {deviceIdString}</p>
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

      {/* Device Password Section */}
      <div className="card mb-6">
        <h2 className="text-2xl font-semibold mb-4">Device Password</h2>

        {passwordError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handleUpdateDevicePassword}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="devicePassword">
              New Device Password
            </label>
            <input
              id="devicePassword"
              type="text"
              className="input"
              value={newDevicePassword}
              onChange={(e) => setNewDevicePassword(e.target.value)}
              placeholder="Enter new device password"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              This password is used when attaching this device to user accounts.
            </p>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={updatingPassword}
          >
            {updatingPassword ? 'Updating...' : 'Update Device Password'}
          </button>
        </form>
      </div>

      {/* Threshold Configuration Section */}
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
