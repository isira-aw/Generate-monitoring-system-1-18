'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebSocket } from '@/lib/useWebSocket';
import { deviceApi } from '@/lib/api';

interface Device {
  deviceId: string;
  name: string;
  location: string;
  active: boolean;
  lastSeenAt: string | null;
}

interface HistoricalData {
  timestamp: number;
  rpm: number;
  power: number;
  voltage: number;
  frequency: number;
}

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.deviceId as string;
  const { data, connected } = useWebSocket(deviceId);
  const [device, setDevice] = useState<Device | null>(null);
  const [history, setHistory] = useState<HistoricalData[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  useEffect(() => {
    loadDeviceInfo();
  }, [deviceId]);

  useEffect(() => {
    if (data?.telemetry) {
      const newPoint: HistoricalData = {
        timestamp: Date.now(),
        rpm: data.telemetry.RPM || 0,
        power: (data.telemetry.Generator_P_L1 || 0) + (data.telemetry.Generator_P_L2 || 0) + (data.telemetry.Generator_P_L3 || 0),
        voltage: data.telemetry.Generator_Voltage_L1_N || 0,
        frequency: data.telemetry.Generator_Frequency || 0,
      };
      
      setHistory(prev => {
        const updated = [...prev, newPoint];
        return updated.slice(-40);
      });
    }
  }, [data]);

  useEffect(() => {
    drawSpeedometer();
  }, [data?.telemetry?.RPM]);

  const loadDeviceInfo = async () => {
    try {
      const deviceData = await deviceApi.getDeviceDashboard(deviceId);
      setDevice(deviceData);
    } catch (err) {
      console.error('Failed to load device info:', err);
    }
  };

  const drawSpeedometer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rpm = data?.telemetry?.RPM || 0;
    const maxRPM = 3000;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 15;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Outer circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 6;
    ctx.stroke();

    // RPM arc
    const startAngle = -Math.PI * 0.75;
    const endAngle = Math.PI * 0.75;
    const angle = startAngle + (endAngle - startAngle) * (rpm / maxRPM);

    let arcColor = '#10b981';
    if (rpm > maxRPM * 0.8) arcColor = '#ef4444';
    else if (rpm > maxRPM * 0.6) arcColor = '#f59e0b';

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, angle);
    ctx.strokeStyle = arcColor;
    ctx.lineWidth = 6;
    ctx.stroke();

    // Needle
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + (radius - 25) * Math.cos(angle),
      centerY + (radius - 25) * Math.sin(angle)
    );
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, 2 * Math.PI);
    ctx.fillStyle = '#1f2937';
    ctx.fill();

    // RPM value
    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(rpm.toFixed(0), centerX, centerY + 35);
    ctx.font = '11px Arial';
    ctx.fillText('RPM', centerX, centerY + 50);
  };

  const telemetry = data?.telemetry;
  const allAlarms = [
    ...(telemetry?.device_alarms || []).map((msg) => ({
      message: msg,
      severity: 'WARNING' as const,
    })),
    ...(data?.backendAlarms || []).map((alarm) => ({
      message: alarm.message,
      severity: alarm.severity,
    })),
  ];

  const totalGeneratorP = telemetry ? 
    (telemetry.Generator_P_L1 || 0) + (telemetry.Generator_P_L2 || 0) + (telemetry.Generator_P_L3 || 0) : 0;

  // Mini sparkline
  const Sparkline = ({ data, color }: { data: number[], color: string }) => {
    if (data.length === 0) return null;
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    return (
      <div className="h-8 flex items-end gap-px">
        {data.map((value, i) => {
          const height = ((value - min) / range) * 100;
          return (
            <div
              key={i}
              className="flex-1 rounded-t"
              style={{
                height: `${height}%`,
                backgroundColor: color,
                opacity: 0.4 + (i / data.length) * 0.6,
                minHeight: '2px'
              }}
            />
          );
        })}
      </div>
    );
  };

  const MetricCard = ({ label, value, unit, color, data }: { 
    label: string; 
    value: number; 
    unit: string; 
    color: string;
    data?: number[];
  }) => (
    <div className="bg-white rounded-lg shadow-sm p-2.5 border border-gray-200">
      <div className="text-xs text-gray-600 mb-1 font-medium">{label}</div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xl font-bold leading-none" style={{ color }}>{value.toFixed(2)}</span>
        <span className="text-xs text-gray-500 ml-2">{unit}</span>
      </div>
      {data && <Sparkline data={data} color={color} />}
    </div>
  );

  const DataRow = ({ label, value, unit, alert }: { label: string; value: any; unit: string; alert?: boolean }) => (
    <div className={`flex justify-between items-center py-1.5 px-2 text-xs border-b border-gray-100 last:border-0 ${alert ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'}`}>
      <span className={`font-medium ${alert ? 'text-red-900' : 'text-gray-700'}`}>{label}</span>
      <div className="flex items-baseline gap-1">
        <span className={`font-semibold ${alert ? 'text-red-900' : 'text-gray-900'}`}>
          {value !== null && value !== undefined ? (typeof value === 'number' ? value.toFixed(2) : value) : 'N/A'}
        </span>
        {unit && <span className="text-gray-500 text-[11px]">{unit}</span>}
      </div>
    </div>
  );

  const CollapsibleSection = ({ title, children, id }: { title: string; children: React.ReactNode; id: string }) => {
    const isExpanded = expandedSection === id;
    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 lg:hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full bg-gradient-to-r from-gray-800 to-gray-700 px-3 py-2.5 flex justify-between items-center hover:from-gray-700 hover:to-gray-600 transition-colors"
        >
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <svg
            className={`h-4 w-4 text-white transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && <div className="p-3">{children}</div>}
      </div>
    );
  };

  return (
    <div className="min-h-screen lg:h-screen bg-gradient-to-br from-gray-50 to-gray-100 lg:overflow-hidden">
      <br /><br />
      <div className="h-full flex flex-col p-3 lg:p-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 lg:mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{device?.name || 'Loading...'}</h1>
            <span className="text-xs text-gray-600 bg-white px-2 py-1 rounded border border-gray-200">ID: {deviceId}</span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full shadow-sm ${connected ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
              {connected ? '● Live' : '○ Offline'}
            </span>
            <button
              onClick={() => router.push(`/device/${deviceId}/history`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents and History
            </button>
            <button
              onClick={() => router.push(`/device/${deviceId}/ai-support`)}
              className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Support
            </button>
          </div>
          {telemetry && (
            <div className="text-left sm:text-right bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs text-gray-600">Last Update</div>
              <div className="text-sm font-semibold text-gray-900">{new Date(telemetry.timestamp).toLocaleTimeString()}</div>
            </div>
          )}
        </div>

        {/* Alert Banner */}
        {allAlarms.length > 0 && (
          <div className="mb-3 lg:mb-4 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <svg className="h-5 w-5 text-orange-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-orange-900 mb-0.5">{allAlarms.length} Active Alert{allAlarms.length > 1 ? 's' : ''}</div>
                <div className="text-xs text-orange-800 truncate">{allAlarms[0]?.message}</div>
              </div>
            </div>
          </div>
        )}

        {/* Mobile: Primary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2  lg:hidden">
          <MetricCard 
            label="Power" 
            value={totalGeneratorP} 
            unit="kW" 
            color="#3b82f6"
            data={history.map(h => h.power)}
          />
          <MetricCard 
            label="Frequency" 
            value={telemetry?.Generator_Frequency || 0} 
            unit="Hz" 
            color="#8b5cf6"
            data={history.map(h => h.frequency)}
          />
          <MetricCard 
            label="Voltage" 
            value={telemetry ? ((telemetry.Generator_Voltage_L1_N || 0) + (telemetry.Generator_Voltage_L2_N || 0) + (telemetry.Generator_Voltage_L3_N || 0)) / 3 : 0} 
            unit="V" 
            color="#10b981"
            data={history.map(h => h.voltage)}
          />
          <MetricCard 
            label="Power Factor" 
            value={telemetry?.Generator_Power_Factor || 0} 
            unit="" 
            color="#f59e0b"
          />
        </div>

        {/* Mobile: RPM Gauge */}
        <div className="bg-white rounded-lg shadow-sm p-3 mb-3 border border-gray-200 lg:hidden">
          <h3 className="text-sm font-semibold mb-2 text-gray-900 text-center">Engine Speed</h3>
          <canvas ref={canvasRef} width={180} height={180} className="mx-auto" />
        </div>

        {/* Mobile: Collapsible Sections */}
        <div className="space-y-2 lg:hidden pb-4">
          
          <CollapsibleSection title="Critical Status" id="status">
            <div className="space-y-0">
              <DataRow label="RPM" value={telemetry?.RPM} unit="rpm" />
              <DataRow label="Battery Voltage" value={telemetry?.Battery_Volts} unit="V" />
              <DataRow label="Oil Pressure" value={telemetry?.Oil_Pressure} unit="Bar" />
              <DataRow label="Oil Temperature" value={telemetry?.Oil_Temperature} unit="°C" />
              <DataRow label="Fuel Level" value={telemetry?.Fuel_Level} unit="%" />
              <DataRow label="E-STOP" value={telemetry?.E_STOP ? 'ACTIVE' : 'Normal'} unit="" alert={telemetry?.E_STOP} />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Generator Power" id="generator">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1.5 pb-1 border-b">Active Power (kW)</div>
                <DataRow label="L1" value={telemetry?.Generator_P_L1} unit="" />
                <DataRow label="L2" value={telemetry?.Generator_P_L2} unit="" />
                <DataRow label="L3" value={telemetry?.Generator_P_L3} unit="" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1.5 pb-1 border-b">Reactive (kVAr)</div>
                <DataRow label="L1" value={telemetry?.Generator_Q_L1} unit="" />
                <DataRow label="L2" value={telemetry?.Generator_Q_L2} unit="" />
                <DataRow label="L3" value={telemetry?.Generator_Q_L3} unit="" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1.5 pb-1 border-b">Apparent (kVA)</div>
                <DataRow label="L1" value={telemetry?.Generator_S_L1} unit="" />
                <DataRow label="L2" value={telemetry?.Generator_S_L2} unit="" />
                <DataRow label="L3" value={telemetry?.Generator_S_L3} unit="" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Voltage & Current" id="voltage">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1.5 pb-1 border-b">Phase-Neutral (V)</div>
                <DataRow label="L1-N" value={telemetry?.Generator_Voltage_L1_N} unit="" />
                <DataRow label="L2-N" value={telemetry?.Generator_Voltage_L2_N} unit="" />
                <DataRow label="L3-N" value={telemetry?.Generator_Voltage_L3_N} unit="" />
                <div className="text-xs font-semibold text-gray-600 mt-2 mb-1.5 pb-1 border-b">Phase-Phase (V)</div>
                <DataRow label="L1-L2" value={telemetry?.Generator_Voltage_L1_L2} unit="" />
                <DataRow label="L2-L3" value={telemetry?.Generator_Voltage_L2_L3} unit="" />
                <DataRow label="L3-L1" value={telemetry?.Generator_Voltage_L3_L1} unit="" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1.5 pb-1 border-b">Current (A)</div>
                <DataRow label="L1" value={telemetry?.Generator_Current_L1} unit="" />
                <DataRow label="L2" value={telemetry?.Generator_Current_L2} unit="" />
                <DataRow label="L3" value={telemetry?.Generator_Current_L3} unit="" />
                <DataRow label="Earth Fault" value={telemetry?.Earth_Fault_Current} unit="" />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Mains/Bus" id="mains">
            <div className="space-y-0">
              <DataRow label="Frequency" value={telemetry?.Mains_Bus_Frequency} unit="Hz" />
              <div className="text-xs font-semibold text-gray-600 mt-2 mb-1.5 px-2 pb-1 border-b">Voltage L-N (V)</div>
              <DataRow label="L1" value={telemetry?.Mains_Bus_Voltage_L1_N} unit="" />
              <DataRow label="L2" value={telemetry?.Mains_Bus_Voltage_L2_N} unit="" />
              <DataRow label="L3" value={telemetry?.Mains_Bus_Voltage_L3_N} unit="" />
              <div className="text-xs font-semibold text-gray-600 mt-2 mb-1.5 px-2 pb-1 border-b">Voltage L-L (V)</div>
              <DataRow label="L1-L2" value={telemetry?.Mains_Bus_Voltage_L1_L2} unit="" />
              <DataRow label="L2-L3" value={telemetry?.Mains_Bus_Voltage_L2_L3} unit="" />
              <DataRow label="L3-L1" value={telemetry?.Mains_Bus_Voltage_L3_L1} unit="" />
              <div className="text-xs font-semibold text-gray-600 mt-2 mb-1.5 px-2 pb-1 border-b">Import</div>
              <DataRow label="Current L1" value={telemetry?.Mains_L1_Current} unit="A" />
              <DataRow label="Active Power" value={telemetry?.Mains_Import_P} unit="kW" />
              <DataRow label="Reactive Power" value={telemetry?.Mains_Import_Q} unit="kVAr" />
              <DataRow label="Power Factor" value={telemetry?.Mains_PF} unit="" />
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Load & Monitoring" id="load">
            <div className="space-y-0">
              <div className="text-xs font-semibold text-gray-600 mb-1.5 px-2 pb-1 border-b">Load</div>
              <DataRow label="Active Power" value={telemetry?.Load_P} unit="kW" />
              <DataRow label="Reactive Power" value={telemetry?.Load_Q} unit="kVAr" />
              <DataRow label="Power Factor" value={telemetry?.Load_PF} unit="" />
              <div className="text-xs font-semibold text-gray-600 mt-2 mb-1.5 px-2 pb-1 border-b">Protection</div>
              <DataRow label="Max Vector Shift" value={telemetry?.Max_Vector_Shift} unit="°" />
              <DataRow label="ROCOF" value={telemetry?.ROCOF} unit="Hz/s" />
              <DataRow label="Max ROCOF" value={telemetry?.Max_ROCOF} unit="Hz/s" />
              <DataRow label="D+" value={telemetry?.D_Plus} unit="V" />
            </div>
          </CollapsibleSection>
        </div>

        {/* Desktop: Perfect Viewport-Locked Grid */}
        <div className="hidden lg:grid flex-1 grid-cols-12 gap-3 min-h-0 overflow-hidden">
          {/* Column 1: RPM & Critical Status (2.5 cols) */}
          <div className="col-span-3 flex flex-col gap-3 min-h-0">
            {/* RPM Gauge */}
            <div className="bg-white rounded-lg shadow-sm p-3 border border-gray-200">
              <h3 className="text-sm font-semibold mb-2 text-gray-900">Engine Speed</h3>
              <canvas ref={canvasRef} width={180} height={180} className="mx-auto" />
            </div>
            
            {/* Primary Metrics */}
            <div className="grid grid-cols-1 gap-2">
              <MetricCard 
                label="Total Power" 
                value={totalGeneratorP} 
                unit="kW" 
                color="#3b82f6"
                data={history.map(h => h.power)}
              />
              <MetricCard 
                label="Frequency" 
                value={telemetry?.Generator_Frequency || 0} 
                unit="Hz" 
                color="#8b5cf6"
                data={history.map(h => h.frequency)}
              />
              <MetricCard 
                label="Avg Voltage" 
                value={telemetry ? ((telemetry.Generator_Voltage_L1_N || 0) + (telemetry.Generator_Voltage_L2_N || 0) + (telemetry.Generator_Voltage_L3_N || 0)) / 3 : 0} 
                unit="V" 
                color="#10b981"
                data={history.map(h => h.voltage)}
              />
              <MetricCard 
                label="Power Factor" 
                value={telemetry?.Generator_Power_Factor || 0} 
                unit="" 
                color="#f59e0b"
              />
            </div>
          </div>

          {/* Column 2: Primary Metrics & Generator (4.5 cols) */}
          <div className="col-span-5 flex flex-col gap-3 min-h-0">
            
            {/* Generator Parameters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Generator Parameters</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 p-3 flex-1 overflow-y-auto">
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Active Power (kW)</div>
                  <DataRow label="L1" value={telemetry?.Generator_P_L1} unit="" />
                  <DataRow label="L2" value={telemetry?.Generator_P_L2} unit="" />
                  <DataRow label="L3" value={telemetry?.Generator_P_L3} unit="" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Reactive Power (kVAr)</div>
                  <DataRow label="L1" value={telemetry?.Generator_Q_L1} unit="" />
                  <DataRow label="L2" value={telemetry?.Generator_Q_L2} unit="" />
                  <DataRow label="L3" value={telemetry?.Generator_Q_L3} unit="" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Apparent Power (kVA)</div>
                  <DataRow label="L1" value={telemetry?.Generator_S_L1} unit="" />
                  <DataRow label="L2" value={telemetry?.Generator_S_L2} unit="" />
                  <DataRow label="L3" value={telemetry?.Generator_S_L3} unit="" />
                </div>
              </div>
            </div>

            {/* Voltage & Current */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Voltage & Current</h3>
              </div>
              <div className="grid grid-cols-3 gap-4 p-3 flex-1 overflow-y-auto">
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Phase-Neutral (V)</div>
                  <DataRow label="L1-N" value={telemetry?.Generator_Voltage_L1_N} unit="" />
                  <DataRow label="L2-N" value={telemetry?.Generator_Voltage_L2_N} unit="" />
                  <DataRow label="L3-N" value={telemetry?.Generator_Voltage_L3_N} unit="" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Phase-Phase (V)</div>
                  <DataRow label="L1-L2" value={telemetry?.Generator_Voltage_L1_L2} unit="" />
                  <DataRow label="L2-L3" value={telemetry?.Generator_Voltage_L2_L3} unit="" />
                  <DataRow label="L3-L1" value={telemetry?.Generator_Voltage_L3_L1} unit="" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Current (A)</div>
                  <DataRow label="L1" value={telemetry?.Generator_Current_L1} unit="" />
                  <DataRow label="L2" value={telemetry?.Generator_Current_L2} unit="" />
                  <DataRow label="L3" value={telemetry?.Generator_Current_L3} unit="" />
                  <DataRow label="Earth Fault" value={telemetry?.Earth_Fault_Current} unit="" />
                </div>
              </div>
            </div>
            {/* Critical Status */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Critical Status</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                <DataRow label="Battery Voltage" value={telemetry?.Battery_Volts} unit="V" />
                <DataRow label="Oil Pressure" value={telemetry?.Oil_Pressure} unit="Bar" />
                <DataRow label="Oil Temperature" value={telemetry?.Oil_Temperature} unit="°C" />
                <DataRow label="Fuel Level" value={telemetry?.Fuel_Level} unit="%" />
                <DataRow label="E-STOP Status" value={telemetry?.E_STOP ? 'ACTIVE' : 'Normal'} unit="" alert={telemetry?.E_STOP} />
              </div>
            </div>
          </div>

          {/* Column 3: Mains & Load (4 cols) */}
          <div className="col-span-4 flex flex-col gap-3 min-h-0">
            {/* Mains/Bus */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Mains/Bus Parameters</h3>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">
                <DataRow label="Frequency" value={telemetry?.Mains_Bus_Frequency} unit="Hz" />
                <div className="text-xs font-semibold text-gray-600 mt-3 mb-2 pb-1 border-b">Voltage Phase-Neutral (V)</div>
                <DataRow label="L1-N" value={telemetry?.Mains_Bus_Voltage_L1_N} unit="" />
                <DataRow label="L2-N" value={telemetry?.Mains_Bus_Voltage_L2_N} unit="" />
                <DataRow label="L3-N" value={telemetry?.Mains_Bus_Voltage_L3_N} unit="" />
                <div className="text-xs font-semibold text-gray-600 mt-3 mb-2 pb-1 border-b">Voltage Phase-Phase (V)</div>
                <DataRow label="L1-L2" value={telemetry?.Mains_Bus_Voltage_L1_L2} unit="" />
                <DataRow label="L2-L3" value={telemetry?.Mains_Bus_Voltage_L2_L3} unit="" />
                <DataRow label="L3-L1" value={telemetry?.Mains_Bus_Voltage_L3_L1} unit="" />
                <div className="text-xs font-semibold text-gray-600 mt-3 mb-2 pb-1 border-b">Import</div>
                <DataRow label="Current L1" value={telemetry?.Mains_L1_Current} unit="A" />
                <DataRow label="Active Power" value={telemetry?.Mains_Import_P} unit="kW" />
                <DataRow label="Reactive Power" value={telemetry?.Mains_Import_Q} unit="kVAr" />
                <DataRow label="Power Factor" value={telemetry?.Mains_PF} unit="" />
              </div>
            </div>

            {/* Load & Monitoring */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 px-3 py-2">
                <h3 className="text-sm font-semibold text-white">Load & Protection</h3>
              </div>
              <div className="p-3 flex-1 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-600 mb-2 pb-1 border-b">Load</div>
                <DataRow label="Active Power" value={telemetry?.Load_P} unit="kW" />
                <DataRow label="Reactive Power" value={telemetry?.Load_Q} unit="kVAr" />
                <DataRow label="Power Factor" value={telemetry?.Load_PF} unit="" />
                <div className="text-xs font-semibold text-gray-600 mt-3 mb-2 pb-1 border-b">Protection</div>
                <DataRow label="Max Vector Shift" value={telemetry?.Max_Vector_Shift} unit="°" />
                <DataRow label="ROCOF" value={telemetry?.ROCOF} unit="Hz/s" />
                <DataRow label="Max ROCOF" value={telemetry?.Max_ROCOF} unit="Hz/s" />
                <DataRow label="D+" value={telemetry?.D_Plus} unit="V" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}