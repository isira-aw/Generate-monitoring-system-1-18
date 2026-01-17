'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWebSocket } from '@/lib/useWebSocket';
import { deviceApi } from '@/lib/api';

interface Device {
  deviceId: string;
  name: string;
  location: string;
  active: boolean;
  lastSeenAt: string | null;
}

export default function DashboardPage() {
  const params = useParams();
  const deviceId = params.deviceId as string;
  const { data, connected } = useWebSocket(deviceId);
  const [device, setDevice] = useState<Device | null>(null);

  useEffect(() => {
    loadDeviceInfo();
  }, [deviceId]);

  const loadDeviceInfo = async () => {
    try {
      const deviceData = await deviceApi.getDeviceDashboard(deviceId);
      setDevice(deviceData);
    } catch (err) {
      console.error('Failed to load device info:', err);
    }
  };

  const telemetry = data?.telemetry;
  const allAlarms = [
    ...(telemetry?.device_alarms || []).map((msg) => ({
      message: msg,
      severity: 'WARNING' as const,
      source: 'Device',
    })),
    ...(data?.backendAlarms || []).map((alarm) => ({
      message: alarm.message,
      severity: alarm.severity,
      source: 'Backend',
    })),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">
          {device?.name || 'Loading...'}
        </h1>
        <div className="flex items-center gap-4">
          <p className="text-gray-600">Device ID: {deviceId}</p>
          <span
            className={`px-3 py-1 text-sm rounded ${
              connected
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {connected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </div>

      {/* Alarms Section */}
      {allAlarms.length > 0 && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">Active Alarms</h2>
          <div className="space-y-2">
            {allAlarms.map((alarm, index) => (
              <div
                key={index}
                className={
                  alarm.severity === 'CRITICAL'
                    ? 'alarm-critical'
                    : 'alarm-warning'
                }
              >
                <div className="flex justify-between items-start">
                  <p className="font-medium">{alarm.message}</p>
                  <span className="text-xs bg-white/50 px-2 py-1 rounded">
                    {alarm.source}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telemetry Data */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Telemetry Data</h2>
        {!telemetry ? (
          <div className="card text-center">
            <p className="text-gray-600">
              Waiting for data from device... Make sure the device is sending
              data to MQTT broker.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Voltage</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.voltage?.toFixed(2) || 'N/A'} V
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Current</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.current?.toFixed(2) || 'N/A'} A
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Frequency</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.frequency?.toFixed(2) || 'N/A'} Hz
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Power</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.power?.toFixed(2) || 'N/A'} kW
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Temperature</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.temperature?.toFixed(2) || 'N/A'} °C
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Fuel Level</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.fuelLevel?.toFixed(2) || 'N/A'} %
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">Oil Pressure</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.oilPressure?.toFixed(2) || 'N/A'} PSI
              </p>
            </div>

            <div className="card">
              <p className="text-sm text-gray-500 mb-1">RPM</p>
              <p className="text-3xl font-bold text-primary">
                {telemetry.rpm?.toFixed(0) || 'N/A'}
              </p>
            </div>
          </div>
        )}

        {telemetry && (
          <p className="text-sm text-gray-500 mt-4 text-center">
            Last update: {new Date(telemetry.timestamp).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
}
