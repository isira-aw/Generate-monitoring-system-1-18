import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws';

export interface TelemetryData {
  deviceId: string;
  timestamp: string;

  // RPM
  RPM?: number;

  // Generator Power (Real Power)
  Generator_P_L1?: number;
  Generator_P_L2?: number;
  Generator_P_L3?: number;

  // Generator Reactive Power
  Generator_Q?: number;
  Generator_Q_L1?: number;
  Generator_Q_L2?: number;
  Generator_Q_L3?: number;

  // Generator Apparent Power
  Generator_S?: number;
  Generator_S_L1?: number;
  Generator_S_L2?: number;
  Generator_S_L3?: number;

  // Generator Power Factor
  Generator_Power_Factor?: number;

  // Generator Frequency
  Generator_Frequency?: number;

  // Generator Voltage (Line to Neutral)
  Generator_Voltage_L1_N?: number;
  Generator_Voltage_L2_N?: number;
  Generator_Voltage_L3_N?: number;

  // Generator Voltage (Line to Line)
  Generator_Voltage_L1_L2?: number;
  Generator_Voltage_L2_L3?: number;
  Generator_Voltage_L3_L1?: number;

  // Generator Current
  Generator_Current_L1?: number;
  Generator_Current_L2?: number;
  Generator_Current_L3?: number;

  // Earth Fault Current
  Earth_Fault_Current?: number;

  // Mains/Bus Frequency
  Mains_Bus_Frequency?: number;

  // Mains/Bus Voltage (Line to Neutral)
  Mains_Bus_Voltage_L1_N?: number;
  Mains_Bus_Voltage_L2_N?: number;
  Mains_Bus_Voltage_L3_N?: number;

  // Mains/Bus Voltage (Line to Line)
  Mains_Bus_Voltage_L1_L2?: number;
  Mains_Bus_Voltage_L2_L3?: number;
  Mains_Bus_Voltage_L3_L1?: number;

  // Mains Current
  Mains_L1_Current?: number;

  // Mains Import
  Mains_Import_P?: number;
  Mains_Import_Q?: number;

  // Mains Power Factor
  Mains_PF?: number;

  // Vector Shift and ROCOF
  Max_Vector_Shift?: number;
  ROCOF?: number;
  Max_ROCOF?: number;

  // Load
  Load_P?: number;
  Load_Q?: number;
  Load_PF?: number;

  // Battery and D+
  Battery_Volts?: number;
  D_Plus?: number;

  // Oil
  Oil_Pressure?: number;
  Oil_Temperature?: number;

  // Fuel Level
  Fuel_Level?: number;

  // E-STOP (Binary)
  E_STOP?: boolean;

  // Alarm string from device
  Alarm?: string;

  // Device alarms list (for compatibility)
  device_alarms?: string[];
}

export interface AlarmData {
  deviceId: string;
  parameter: string;
  message: string;
  severity: 'WARNING' | 'CRITICAL';
  value: number;
  timestamp: string;
}

export interface DeviceDataMessage {
  telemetry: TelemetryData;
  backendAlarms: AlarmData[];
}

export const useWebSocket = (deviceId: string) => {
  const [data, setData] = useState<DeviceDataMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        console.log('STOMP Debug:', str);
      },
      onConnect: () => {
        console.log('WebSocket connected');
        setConnected(true);

        // Subscribe to device-specific topic
        client.subscribe(`/topic/device/${deviceId}`, (message) => {
          try {
            const parsedData = JSON.parse(message.body);
            setData(parsedData);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error:', frame);
        setConnected(false);
      },
      onDisconnect: () => {
        console.log('WebSocket disconnected');
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      if (clientRef.current) {
        clientRef.current.deactivate();
      }
    };
  }, [deviceId]);

  return { data, connected };
};
