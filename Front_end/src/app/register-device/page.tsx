'use client';

import { useState } from 'react';
import { deviceApi } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function RegisterDevicePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    deviceId: '',
    devicePassword: '',
    name: '',
    location: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.deviceId.trim()) {
      setError('Device ID is required');
      return;
    }
    if (!formData.devicePassword.trim()) {
      setError('Device Password is required');
      return;
    }
    if (!formData.name.trim()) {
      setError('Device Name is required');
      return;
    }
    if (!formData.location.trim()) {
      setError('Location is required');
      return;
    }

    setSubmitting(true);
    try {
      await deviceApi.registerDevice({
        deviceId: formData.deviceId.trim(),
        devicePassword: formData.devicePassword.trim(),
        name: formData.name.trim(),
        location: formData.location.trim(),
      });

      setSuccess(true);
      setFormData({ deviceId: '', devicePassword: '', name: '', location: '' });

      // Optionally redirect after success
      setTimeout(() => {
        router.push('/devices');
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 400) {
        setError('Device ID already exists or invalid data provided');
      } else {
        setError('Failed to register device. Please try again.');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-2 text-center">Register New Device</h1>
          <p className="text-gray-600 text-center mb-8">
            Register a new generator device that can be assigned to multiple users
          </p>

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
              Device registered successfully! Redirecting to devices page...
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-2">
                Device ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="deviceId"
                className="input w-full"
                placeholder="e.g., GEN001"
                value={formData.deviceId}
                onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                disabled={submitting}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Unique identifier for the device (will be used in MQTT topics)
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="devicePassword" className="block text-sm font-medium text-gray-700 mb-2">
                Device Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="devicePassword"
                className="input w-full"
                placeholder="Enter a secure password"
                value={formData.devicePassword}
                onChange={(e) => setFormData({ ...formData, devicePassword: e.target.value })}
                disabled={submitting}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Users will need this password to attach the device to their account
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Device Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                className="input w-full"
                placeholder="e.g., Main Building Generator"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={submitting}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Friendly name for the device
              </p>
            </div>

            <div className="mb-8">
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                className="input w-full"
                placeholder="e.g., Building A, Floor 1"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                disabled={submitting}
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Physical location of the device
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 mb-2">Multi-User Support</h3>
              <p className="text-sm text-blue-800">
                Once registered, this device can be assigned to multiple users. Users can attach the device
                to their account using the Device ID and Password from the "My Devices" page.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="btn btn-secondary flex-1"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary flex-1"
                disabled={submitting}
              >
                {submitting ? 'Registering...' : 'Register Device'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Registration Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>Fill in all required fields marked with <span className="text-red-500">*</span></li>
            <li>Choose a unique Device ID that will be used in MQTT topics (format: generator/DEVICE_ID/data)</li>
            <li>Set a secure password that users will need to attach this device</li>
            <li>Provide a descriptive name and location for easy identification</li>
            <li>After registration, share the Device ID and Password with authorized users</li>
            <li>Users can attach the device from their "My Devices" page using the credentials</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
