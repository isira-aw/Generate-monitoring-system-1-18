'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { deviceApi } from '@/lib/api';
import Link from 'next/link';

interface Device {
  id: number;
  deviceId: string;
  name: string;
  location: string;
  active: boolean;
  lastSeenAt: string | null;
}

export default function DevicesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    deviceId: '',
    devicePassword: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      loadDevices();
    }
  }, [user]);

  const loadDevices = async () => {
    try {
      setError('');
      const data = await deviceApi.getAllDevices();
      setDevices(data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to load devices');
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.deviceId.trim()) {
      setFormError('Device ID is required');
      return;
    }
    if (!formData.devicePassword.trim()) {
      setFormError('Device password is required');
      return;
    }

    setSubmitting(true);
    try {
      await deviceApi.attachDevice({
        deviceId: formData.deviceId.trim(),
        devicePassword: formData.devicePassword.trim(),
      });

      // Reset form and close modal
      setFormData({ deviceId: '', devicePassword: '' });
      setShowAddModal(false);

      // Reload devices
      await loadDevices();
    } catch (err: any) {
      if (err.response?.status === 400) {
        setFormError(err.response?.data?.message || 'Invalid device credentials or device already attached');
      } else if (err.response?.status === 401) {
        router.push('/login');
      } else {
        setFormError('Failed to add device. Please try again.');
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({ deviceId: '', devicePassword: '' });
    setFormError('');
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">My Devices</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add Device
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-600 mb-4">
            No devices attached to your account yet.
          </p>
          <p className="text-sm text-gray-500">
            Click the "Add Device" button above to attach a device using its ID and password.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {devices.map((device) => (
            <div key={device.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold">{device.name}</h3>
                  <p className="text-sm text-gray-500">ID: {device.deviceId}</p>
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    device.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {device.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <p className="text-gray-600 mb-2">
                {device.location || 'Unknown location'}
              </p>

              {device.lastSeenAt && (
                <p className="text-sm text-gray-500 mb-4">
                  Last seen: {new Date(device.lastSeenAt).toLocaleString()}
                </p>
              )}

              <div className="flex gap-2">
                <Link
                  href={`/device/${device.deviceId}/dashboard`}
                  className="btn btn-primary flex-1 text-center"
                >
                  Dashboard
                </Link>
                <Link
                  href={`/device/${device.deviceId}/settings`}
                  className="btn btn-secondary flex-1 text-center"
                >
                  Settings
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Add Device</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                disabled={submitting}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddDevice}>
              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-2">
                  Device ID
                </label>
                <input
                  type="text"
                  id="deviceId"
                  className="input w-full"
                  placeholder="Enter device ID"
                  value={formData.deviceId}
                  onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="devicePassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Password
                </label>
                <input
                  type="password"
                  id="devicePassword"
                  className="input w-full"
                  placeholder="Enter device password"
                  value={formData.devicePassword}
                  onChange={(e) => setFormData({ ...formData, devicePassword: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
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
                  {submitting ? 'Adding...' : 'Add Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
