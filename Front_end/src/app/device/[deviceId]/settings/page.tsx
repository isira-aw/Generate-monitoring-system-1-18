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
      await deviceApi.requestDeviceVerification(device.deviceId);
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
      const response = await deviceApi.verifyDeviceCode(device.deviceId, verificationCode);
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

  const handleUpdate = async (parameter: string, minValue: number, maxValue: number) => {
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
      await deviceApi.updateDevicePassword(device.deviceId, newDevicePassword);
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
      <div className="min-h-screen bg-[#d9d9d9] flex items-center justify-center">
        <p className="text-[#1E40AF] text-lg font-medium">Loading...</p>
      </div>
    );
  }

  if (!user || !device) {
    return null;
  }

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#d9d9d9]">
        <div className="container mx-auto px-4 py-16">
          <br /><br />
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-xl p-8">
              <h1 className="text-3xl font-bold mb-6 text-center text-[#1E40AF]">Verify Access</h1>
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
                className="w-full bg-[#1E40AF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700 mb-4"
                disabled={sendingCode}
              >
                {sendingCode ? 'Sending...' : 'Send Verification Code'}
              </button>

              <form onSubmit={handleVerifyCode}>
                <div className="mb-4">
                  <label className="block text-gray-700 mb-2 font-medium" htmlFor="code">
                    Verification Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
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
                  className="w-full bg-[#1E40AF] text-white py-3 rounded-lg font-semibold hover:bg-blue-700"
                  disabled={verifying}
                >
                  {verifying ? 'Verifying...' : 'Verify Code'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => router.back()}
                  className="text-[#1E40AF] hover:underline"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d9d9d9]">
      <div className="container mx-auto px-4 py-8">
        <br /><br />
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-[#1E40AF] mb-2">Device Settings</h1>
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

        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-[#1E40AF]">Device Password</h2>

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
              <label className="block text-gray-700 mb-2 font-medium" htmlFor="devicePassword">
                New Device Password
              </label>
              <input
                id="devicePassword"
                type="text"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
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
              className="bg-[#1E40AF] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              disabled={updatingPassword}
            >
              {updatingPassword ? 'Updating...' : 'Update Device Password'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-2xl font-semibold mb-6 text-[#1E40AF]">Threshold Configuration</h2>

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
    </div>
  );
}

function ThresholdEditor({
  threshold,
  onUpdate,
  isSaving,
}: {
  threshold: Threshold;
  onUpdate: (parameter: string, minValue: number, maxValue: number) => void;
  isSaving: boolean;
}) {
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
    .map((word) => {
      if (['RPM', 'PF', 'LN', 'LL', 'ROCOF', 'KW', 'KVAR', 'KVA', 'HZ'].includes(word)) {
        return word;
      }
      return word.charAt(0) + word.slice(1).toLowerCase();
    })
    .join(' ');

  return (
    <form onSubmit={handleSubmit} className="border-b border-gray-200 pb-6 last:border-b-0">
      <h3 className="text-lg font-semibold mb-3 text-[#1E40AF]">{parameterName}</h3>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Minimum Value ({threshold.unit})
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
            value={minValue}
            onChange={(e) => setMinValue(parseFloat(e.target.value))}
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 mb-2 font-medium">
            Maximum Value ({threshold.unit})
          </label>
          <input
            type="number"
            step="0.01"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#1E40AF] bg-gray-50"
            value={maxValue}
            onChange={(e) => setMaxValue(parseFloat(e.target.value))}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        className="bg-[#1E40AF] text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
        disabled={isSaving}
      >
        {isSaving ? 'Saving...' : 'Update Threshold'}
      </button>
    </form>
  );
}
