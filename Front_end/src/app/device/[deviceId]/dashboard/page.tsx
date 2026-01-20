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

interface Threshold {
  id: number;
  parameter: string;
  minValue: number;
  maxValue: number;
  unit: string;
}

export default function DashboardPage() {
  const params = useParams();
  const deviceId = params.deviceId as string;
  const { data, connected } = useWebSocket(deviceId);
  const [device, setDevice] = useState<Device | null>(null);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);

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

  // Helper function to format parameter display name
  const formatParameterName = (param: string) => {
    return param.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Data table rows definition
  const dataRows = telemetry ? [
    { name: 'RPM', value: telemetry.RPM, unit: 'rpm' },
    { name: 'Generator P L1', value: telemetry.Generator_P_L1, unit: 'kW' },
    { name: 'Generator P L2', value: telemetry.Generator_P_L2, unit: 'kW' },
    { name: 'Generator P L3', value: telemetry.Generator_P_L3, unit: 'kW' },
    { name: 'Generator Q', value: telemetry.Generator_Q, unit: 'kVAr' },
    { name: 'Generator Q L1', value: telemetry.Generator_Q_L1, unit: 'kVAr' },
    { name: 'Generator Q L2', value: telemetry.Generator_Q_L2, unit: 'kVAr' },
    { name: 'Generator Q L3', value: telemetry.Generator_Q_L3, unit: 'kVAr' },
    { name: 'Generator S', value: telemetry.Generator_S, unit: 'kVA' },
    { name: 'Generator S L1', value: telemetry.Generator_S_L1, unit: 'kVA' },
    { name: 'Generator S L2', value: telemetry.Generator_S_L2, unit: 'kVA' },
    { name: 'Generator S L3', value: telemetry.Generator_S_L3, unit: 'kVA' },
    { name: 'Generator Power Factor', value: telemetry.Generator_Power_Factor, unit: '' },
    { name: 'Generator Frequency', value: telemetry.Generator_Frequency, unit: 'Hz' },
    { name: 'Generator Voltage L1-N', value: telemetry.Generator_Voltage_L1_N, unit: 'V' },
    { name: 'Generator Voltage L2-N', value: telemetry.Generator_Voltage_L2_N, unit: 'V' },
    { name: 'Generator Voltage L3-N', value: telemetry.Generator_Voltage_L3_N, unit: 'V' },
    { name: 'Generator Voltage L1-L2', value: telemetry.Generator_Voltage_L1_L2, unit: 'V' },
    { name: 'Generator Voltage L2-L3', value: telemetry.Generator_Voltage_L2_L3, unit: 'V' },
    { name: 'Generator Voltage L3-L1', value: telemetry.Generator_Voltage_L3_L1, unit: 'V' },
    { name: 'Generator Current L1', value: telemetry.Generator_Current_L1, unit: 'A' },
    { name: 'Generator Current L2', value: telemetry.Generator_Current_L2, unit: 'A' },
    { name: 'Generator Current L3', value: telemetry.Generator_Current_L3, unit: 'A' },
    { name: 'Earth Fault Current', value: telemetry.Earth_Fault_Current, unit: 'A' },
    { name: 'Mains/Bus Frequency', value: telemetry.Mains_Bus_Frequency, unit: 'Hz' },
    { name: 'Mains/Bus Voltage L1-N', value: telemetry.Mains_Bus_Voltage_L1_N, unit: 'V' },
    { name: 'Mains/Bus Voltage L2-N', value: telemetry.Mains_Bus_Voltage_L2_N, unit: 'V' },
    { name: 'Mains/Bus Voltage L3-N', value: telemetry.Mains_Bus_Voltage_L3_N, unit: 'V' },
    { name: 'Mains/Bus Voltage L1-L2', value: telemetry.Mains_Bus_Voltage_L1_L2, unit: 'V' },
    { name: 'Mains/Bus Voltage L2-L3', value: telemetry.Mains_Bus_Voltage_L2_L3, unit: 'V' },
    { name: 'Mains/Bus Voltage L3-L1', value: telemetry.Mains_Bus_Voltage_L3_L1, unit: 'V' },
    { name: 'Mains L1 Current', value: telemetry.Mains_L1_Current, unit: 'A' },
    { name: 'Mains Import P', value: telemetry.Mains_Import_P, unit: 'kW' },
    { name: 'Mains Import Q', value: telemetry.Mains_Import_Q, unit: 'kVAr' },
    { name: 'Mains PF', value: telemetry.Mains_PF, unit: '' },
    { name: 'Max Vector Shift', value: telemetry.Max_Vector_Shift, unit: '°' },
    { name: 'ROCOF', value: telemetry.ROCOF, unit: 'Hz/s' },
    { name: 'Max ROCOF', value: telemetry.Max_ROCOF, unit: 'Hz/s' },
    { name: 'Load P', value: telemetry.Load_P, unit: 'kW' },
    { name: 'Load Q', value: telemetry.Load_Q, unit: 'kVAr' },
    { name: 'Load PF', value: telemetry.Load_PF, unit: '' },
    { name: 'Battery Volts', value: telemetry.Battery_Volts, unit: 'V' },
    { name: 'D+', value: telemetry.D_Plus, unit: 'V' },
    { name: 'Oil Pressure', value: telemetry.Oil_Pressure, unit: 'Bar' },
    { name: 'Oil Temperature', value: telemetry.Oil_Temperature, unit: '°C' },
    { name: 'Fuel Level', value: telemetry.Fuel_Level, unit: '%' },
    { name: 'E-STOP', value: telemetry.E_STOP ? 1 : 0, unit: '' },
  ] : [];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
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

      {/* Notification Bar for System Alerts */}
      {allAlarms.length > 0 && (
        <div className="mb-6">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-4 shadow-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-orange-800 mb-2">
                  System Alerts ({allAlarms.length})
                </h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allAlarms.map((alarm, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded ${
                        alarm.severity === 'CRITICAL'
                          ? 'bg-red-100 border border-red-300'
                          : 'bg-yellow-100 border border-yellow-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <p className={`font-medium ${
                          alarm.severity === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'
                        }`}>
                          {alarm.message}
                        </p>
                        <div className="flex gap-2">
                          <span className="text-xs bg-white px-2 py-1 rounded font-semibold">
                            {alarm.source}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded font-semibold ${
                            alarm.severity === 'CRITICAL'
                              ? 'bg-red-600 text-white'
                              : 'bg-yellow-600 text-white'
                          }`}>
                            {alarm.severity}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MQTT Data Table */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">Real-time MQTT Data</h2>
        {!telemetry ? (
          <div className="card text-center">
            <p className="text-gray-600">
              Waiting for data from device... Make sure the device is sending
              data to MQTT broker.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Parameter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataRows.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                        {row.value !== null && row.value !== undefined
                          ? typeof row.value === 'number'
                            ? row.value.toFixed(2)
                            : row.value
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {telemetry && (
              <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Last update: {new Date(telemetry.timestamp).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
