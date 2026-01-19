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

  const handleDetachDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to detach this device? You will need the device password to re-attach it.')) {
      return;
    }

    try {
      await deviceApi.detachDevice(deviceId);
      setSuccessMessage('Device detached successfully');
      await loadDevices();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message;
      setError(errorMessage || 'Failed to detach device');
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
        editingDevice.deviceId,
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

      {successMessage && !showAddModal && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {successMessage}
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
    <div
      key={device.id}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-5 flex flex-col justify-between"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{device.name}</h3>
          <p className="text-sm text-gray-500 mt-1">ID: {device.deviceId}</p>
        </div>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${
            device.active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {device.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Location & Last Seen */}
      <div className="mb-4">
        <p className="text-gray-600">{device.location || 'Unknown location'}</p>
        {device.lastSeenAt && (
          <p className="text-sm text-gray-400 mt-1">
            Last seen: {new Date(device.lastSeenAt).toLocaleString()}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Link
            href={`/device/${device.deviceId}/dashboard`}
            className="flex-1 text-center py-2 px-4 btn btn-primary text-white rounded-lg hover:bg-blue-600 transition-colors duration-200"
          >
            Dashboard
          </Link>
          
        </div>
        <div className="flex gap-2">
          <Link
            href={`/device/${device.deviceId}/settings`}
            className="flex-1 text-center py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors duration-200"
          >
            Thresholds
          </Link>
          <button
            onClick={() => handleEditDevice(device)}
            className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors duration-200"
          >
            Edit
          </button>
          <button
            onClick={() => handleDetachDevice(device.deviceId)}
            className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-200"
          >
            Detach
          </button>
        </div>
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
