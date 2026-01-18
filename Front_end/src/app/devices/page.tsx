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
  const [successMessage, setSuccessMessage] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', location: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

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
    setSuccessMessage('');

    // Validation
    const deviceId = formData.deviceId.trim();
    const devicePassword = formData.devicePassword.trim();

    if (!deviceId) {
      setFormError('Device ID is required');
      return;
    }

    if (!devicePassword) {
      setFormError('Device password is required');
      return;
    }

    if (deviceId.length < 3) {
      setFormError('Device ID must be at least 3 characters');
      return;
    }

    if (devicePassword.length < 4) {
      setFormError('Device password must be at least 4 characters');
      return;
    }

    setSubmitting(true);
    try {
      await deviceApi.attachDevice({
        deviceId,
        devicePassword,
      });

      // Reset form
      setFormData({ deviceId: '', devicePassword: '' });

      // Show success message
      setSuccessMessage('Device attached successfully!');

      // Reload devices
      await loadDevices();

      // Close modal after a short delay
      setTimeout(() => {
        setShowAddModal(false);
        setSuccessMessage('');
      }, 1500);

    } catch (err: any) {
      console.error('Error attaching device:', err);

      // Handle different error types from backend
      const errorMessage = err.response?.data?.message;
      const errorCode = err.response?.data?.error;

      if (err.response?.status === 401 || errorCode === 'INVALID_PASSWORD') {
        setFormError(errorMessage || 'Invalid device password');
      } else if (err.response?.status === 404 || errorCode === 'DEVICE_NOT_FOUND') {
        setFormError(errorMessage || 'Device not found. Please check the Device ID.');
      } else if (err.response?.status === 409 || errorCode === 'DEVICE_ALREADY_ATTACHED') {
        setFormError(errorMessage || 'This device is already attached to your account');
      } else if (err.response?.status === 400 || errorCode === 'INVALID_INPUT') {
        setFormError(errorMessage || 'Invalid input. Please check your entries.');
      } else if (err.response?.status === 403 || errorCode === 'ACCESS_DENIED') {
        setFormError(errorMessage || 'You do not have permission to attach this device');
      } else {
        setFormError(errorMessage || 'Failed to attach device. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setFormData({ deviceId: '', devicePassword: '' });
    setFormError('');
    setSuccessMessage('');
  };

  const handleDetachDevice = async (deviceId: number, deviceName: string) => {
    const confirmed = confirm(
      `Remove "${deviceName}" from your list?\n\n` +
      `This will remove the device from YOUR account only.\n` +
      `• The device will no longer appear in your device list\n` +
      `• Other users can still access this device\n` +
      `• You can re-attach it anytime using the device password\n\n` +
      `Do you want to continue?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deviceApi.detachDevice(deviceId);
      setSuccessMessage(`"${deviceName}" removed from your list successfully`);
      await loadDevices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message;
      setError(errorMessage || 'Failed to remove device from your list');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteDevice = async (deviceId: string, deviceName: string) => {
    const confirmed = confirm(
      `⚠️ PERMANENTLY DELETE "${deviceName}"?\n\n` +
      `WARNING: This action CANNOT be undone!\n\n` +
      `This will:\n` +
      `• Delete the device from the entire system\n` +
      `• Remove it from ALL users' accounts\n` +
      `• Delete all device data, settings, and history\n\n` +
      `If you just want to remove it from YOUR list, use "Remove from My List" instead.\n\n` +
      `Are you absolutely sure you want to DELETE this device?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deviceApi.deleteDevice(deviceId);
      setSuccessMessage(`"${deviceName}" has been permanently deleted`);
      await loadDevices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message;
      setError(errorMessage || 'Failed to delete device');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setEditFormData({ name: device.name, location: device.location });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingDevice) return;

    if (!editFormData.name.trim() || !editFormData.location.trim()) {
      setFormError('Name and location are required');
      return;
    }

    setSubmitting(true);
    try {
      await deviceApi.updateDeviceInfo(
        editingDevice.id,
        editFormData.name.trim(),
        editFormData.location.trim()
      );

      setSuccessMessage('Device updated successfully');
      setShowEditModal(false);
      setEditingDevice(null);
      await loadDevices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message;
      setFormError(errorMessage || 'Failed to update device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingDevice(null);
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">My Devices</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-primary"
        >
          + Add Device
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <span className="text-2xl mr-3">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Device Management Options:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>🗑️ Remove:</strong> Removes the device from YOUR list only. Other users can still access it. You can re-attach it anytime with the password.</li>
              <li><strong>⚠️ Delete Permanently:</strong> Deletes the device from the ENTIRE SYSTEM for ALL users. This cannot be undone!</li>
            </ul>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && !showAddModal && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="card text-center">
          <div className="text-6xl mb-4">📱</div>
          <p className="text-gray-600 mb-2 text-lg font-semibold">
            No devices in your list yet
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Click the "+ Add Device" button above to attach a device to your account.
          </p>
          <div className="bg-gray-50 rounded p-4 text-left text-sm">
            <p className="font-semibold mb-2">💡 Quick Tips:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• You need the Device ID and Password to attach a device</li>
              <li>• The same device can be shared with multiple users</li>
              <li>• Use "Remove" to take devices off your list anytime</li>
            </ul>
          </div>
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

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Link
                    href={`/device/${device.deviceId}/dashboard`}
                    className="btn btn-primary flex-1 text-center text-sm"
                  >
                    📊 Dashboard
                  </Link>
                  <Link
                    href={`/device/${device.deviceId}/settings`}
                    className="btn btn-secondary flex-1 text-center text-sm"
                  >
                    ⚙️ Settings
                  </Link>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditDevice(device)}
                    className="btn bg-blue-500 hover:bg-blue-600 text-white flex-1 text-sm"
                    title="Edit device name and location"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDetachDevice(device.id, device.name)}
                    className="btn bg-orange-500 hover:bg-orange-600 text-white flex-1 text-sm"
                    title="Remove this device from your list (you can re-attach it later)"
                  >
                    🗑️ Remove
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteDevice(device.deviceId, device.name)}
                  className="btn bg-red-600 hover:bg-red-700 text-white w-full text-sm font-bold"
                  title="⚠️ PERMANENTLY delete this device from the system (affects all users)"
                >
                  ⚠️ Delete Permanently
                </button>
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

              {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                  {successMessage}
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

      {/* Edit Device Modal */}
      {showEditModal && editingDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Edit Device</h2>
              <button
                onClick={handleCloseEditModal}
                className="text-gray-500 hover:text-gray-700 text-2xl"
                disabled={submitting}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmitEdit}>
              {formError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {formError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device ID (Read-only)
                </label>
                <input
                  type="text"
                  className="input w-full bg-gray-100"
                  value={editingDevice.deviceId}
                  disabled
                />
              </div>

              <div className="mb-4">
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name
                </label>
                <input
                  type="text"
                  id="edit-name"
                  className="input w-full"
                  placeholder="Enter device name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="mb-6">
                <label htmlFor="edit-location" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  id="edit-location"
                  className="input w-full"
                  placeholder="Enter location"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleCloseEditModal}
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
                  {submitting ? 'Updating...' : 'Update Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
