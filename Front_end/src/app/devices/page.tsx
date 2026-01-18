'use client';

import { useEffect, useState } from 'react';
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const data = await deviceApi.getAllDevices();
      setDevices(data);
    } catch (err) {
      setError('Failed to load devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading devices...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Devices</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {devices.length === 0 ? (
        <div className="card text-center">
          <p className="text-gray-600">
            No devices found. Devices will appear here when they send data.
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
                📍 {device.location || 'Unknown location'}
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
    </div>
  );
}
