'use client';

import React, { useEffect, useState } from 'react';
import ProtectedLayout from '@/components/ProtectedLayout';
import { deviceApi } from '@/lib/api';
import {
  Plus,
  Trash2,
  X,
  Pencil,
  KeyRound,
  ShieldCheck,
  ShieldOff,
  Monitor,
  Search,
} from 'lucide-react';

interface Device {
  id: number;
  deviceId: string;
  name: string;
  location: string;
  active: boolean;
  licenseEnabled: boolean;
  lastSeenAt: string | null;
}

type ModalType = 'register' | 'edit' | 'password' | null;

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Register form
  const [registerForm, setRegisterForm] = useState({
    deviceId: '',
    devicePassword: '',
    name: '',
    location: '',
  });

  // Edit form
  const [editForm, setEditForm] = useState({ name: '', location: '' });

  // Password form
  const [passwordForm, setPasswordForm] = useState({ devicePassword: '' });

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const response = await deviceApi.getAll();
      setDevices(response.data);
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await deviceApi.register(registerForm);
      setModalType(null);
      setRegisterForm({ deviceId: '', devicePassword: '', name: '', location: '' });
      loadDevices();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to register device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setFormError('');
    setSubmitting(true);
    try {
      await deviceApi.update(selectedDevice.deviceId, editForm);
      setModalType(null);
      setSelectedDevice(null);
      loadDevices();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to update device');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice) return;
    setFormError('');
    setSubmitting(true);
    try {
      await deviceApi.updatePassword(selectedDevice.deviceId, passwordForm.devicePassword);
      setModalType(null);
      setSelectedDevice(null);
      setPasswordForm({ devicePassword: '' });
      loadDevices();
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLicense = async (device: Device) => {
    const newState = !device.licenseEnabled;
    const action = newState ? 'enable' : 'disable';
    if (!confirm(`Are you sure you want to ${action} the license for "${device.name}"?`)) return;

    try {
      await deviceApi.toggleLicense(device.deviceId, newState);
      loadDevices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle license');
    }
  };

  const handleDelete = async (device: Device) => {
    if (!confirm(`Are you sure you want to delete device "${device.name}" (${device.deviceId})?`)) return;

    try {
      await deviceApi.delete(device.deviceId);
      loadDevices();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete device');
    }
  };

  const openEdit = (device: Device) => {
    setSelectedDevice(device);
    setEditForm({ name: device.name, location: device.location });
    setFormError('');
    setModalType('edit');
  };

  const openPassword = (device: Device) => {
    setSelectedDevice(device);
    setPasswordForm({ devicePassword: '' });
    setFormError('');
    setModalType('password');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedDevice(null);
    setFormError('');
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ProtectedLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1E40AF] mb-1">Manage Devices</h1>
            <p className="text-black/60">Register, edit, and manage device licenses</p>
          </div>
          <button
            onClick={() => { setFormError(''); setModalType('register'); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1E40AF] text-[#d9d9d9] rounded-lg hover:bg-[#1E40AF]/90 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            Register Device
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1E40AF]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by device ID, name, or location..."
              className="w-full pl-10 pr-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-sm text-black"
            />
          </div>
        </div>

        {/* Devices table */}
        <div className="bg-white rounded-xl shadow-sm border border-[#1E40AF]/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-[#d9d9d9]/50 border-b border-[#1E40AF]/20">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">Device</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">Device ID</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">Location</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">License</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-[#1E40AF] uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E40AF]/10">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 bg-[#d9d9d9] rounded w-20 animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-black/50">
                      {searchQuery ? 'No devices match your search' : 'No devices registered'}
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-[#d9d9d9]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            device.active ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <Monitor className={`w-4 h-4 ${device.active ? 'text-green-600' : 'text-gray-400'}`} />
                          </div>
                          <span className="text-sm font-medium text-black">{device.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="text-sm bg-[#d9d9d9] px-2 py-1 rounded text-black">{device.deviceId}</code>
                      </td>
                      <td className="px-6 py-4 text-sm text-black/70">{device.location}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          device.active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {device.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleLicense(device)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                            device.licenseEnabled
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-700 hover:bg-red-200'
                          }`}
                          title={device.licenseEnabled ? 'Click to disable license' : 'Click to enable license'}
                        >
                          {device.licenseEnabled ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Enabled
                            </>
                          ) : (
                            <>
                              <ShieldOff className="w-3.5 h-3.5" />
                              Disabled
                            </>
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(device)}
                            className="p-2 text-[#1E40AF]/40 hover:text-[#1E40AF] hover:bg-[#1E40AF]/10 rounded-lg transition-colors"
                            title="Edit device"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openPassword(device)}
                            className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Change password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(device)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete device"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Register Device Modal */}
        {modalType === 'register' && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#1E40AF]/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center">
                    <Monitor className="w-5 h-5 text-[#1E40AF]" />
                  </div>
                  <h2 className="text-lg font-bold text-[#1E40AF]">Register New Device</h2>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-[#d9d9d9] rounded-lg transition-colors">
                  <X className="w-5 h-5 text-[#1E40AF]/40" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Device ID</label>
                  <input
                    type="text"
                    required
                    value={registerForm.deviceId}
                    onChange={(e) => setRegisterForm({ ...registerForm, deviceId: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                    placeholder="e.g., GEN-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Device Password</label>
                  <input
                    type="password"
                    required
                    value={registerForm.devicePassword}
                    onChange={(e) => setRegisterForm({ ...registerForm, devicePassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                    placeholder="Device access password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Device Name</label>
                  <input
                    type="text"
                    required
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                    placeholder="e.g., Main Generator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={registerForm.location}
                    onChange={(e) => setRegisterForm({ ...registerForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                    placeholder="e.g., Building A - Floor 1"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-[#1E40AF]/30 text-black rounded-lg hover:bg-[#d9d9d9] transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#1E40AF] text-[#d9d9d9] rounded-lg hover:bg-[#1E40AF]/90 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Registering...' : 'Register Device'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Device Modal */}
        {modalType === 'edit' && selectedDevice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#1E40AF]/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center">
                    <Pencil className="w-5 h-5 text-[#1E40AF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1E40AF]">Edit Device</h2>
                    <p className="text-xs text-black/60">{selectedDevice.deviceId}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-[#d9d9d9] rounded-lg transition-colors">
                  <X className="w-5 h-5 text-[#1E40AF]/40" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
              )}

              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Device Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Location</label>
                  <input
                    type="text"
                    required
                    value={editForm.location}
                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-[#1E40AF]/30 text-black rounded-lg hover:bg-[#d9d9d9] transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#1E40AF] text-[#d9d9d9] rounded-lg hover:bg-[#1E40AF]/90 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Password Modal */}
        {modalType === 'password' && selectedDevice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-[#1E40AF]/20">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E40AF]/10 rounded-lg flex items-center justify-center">
                    <KeyRound className="w-5 h-5 text-[#1E40AF]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#1E40AF]">Change Device Password</h2>
                    <p className="text-xs text-black/60">{selectedDevice.deviceId} - {selectedDevice.name}</p>
                  </div>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-[#d9d9d9] rounded-lg transition-colors">
                  <X className="w-5 h-5 text-[#1E40AF]/40" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
              )}

              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordForm.devicePassword}
                    onChange={(e) => setPasswordForm({ devicePassword: e.target.value })}
                    className="w-full px-4 py-2.5 border border-[#1E40AF]/30 rounded-lg focus:ring-2 focus:ring-[#1E40AF] focus:border-[#1E40AF] outline-none text-black"
                    placeholder="Enter new device password"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-2.5 border border-[#1E40AF]/30 text-black rounded-lg hover:bg-[#d9d9d9] transition-colors font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-[#1E40AF] text-[#d9d9d9] rounded-lg hover:bg-[#1E40AF]/90 transition-colors font-medium text-sm disabled:opacity-50"
                  >
                    {submitting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
