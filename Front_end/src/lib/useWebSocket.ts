import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws';

export interface TelemetryData {
  deviceId: string;
  timestamp: string;

  // RPM
  rpm?: number;

  // Generator Power (Real Power)
  generatorPL1?: number;
  generatorPL2?: number;
  generatorPL3?: number;

  // Generator Reactive Power
  generatorQ?: number;
  generatorQL1?: number;
  generatorQL2?: number;
  generatorQL3?: number;

  // Generator Apparent Power
  generatorS?: number;
  generatorSL1?: number;
  generatorSL2?: number;
  generatorSL3?: number;

  // Generator Power Factor
  generatorPowerFactor?: number;

  // Generator Frequency
  generatorFrequency?: number;

  // Generator Voltage (Line to Neutral)
  generatorVoltageL1N?: number;
  generatorVoltageL2N?: number;
  generatorVoltageL3N?: number;

  // Generator Voltage (Line to Line)
  generatorVoltageL1L2?: number;
  generatorVoltageL2L3?: number;
  generatorVoltageL3L1?: number;

  // Generator Current
  generatorCurrentL1?: number;
  generatorCurrentL2?: number;
  generatorCurrentL3?: number;

  // Earth Fault Current
  earthFaultCurrent?: number;

  // Mains/Bus Frequency
  mainsBusFrequency?: number;

  // Mains/Bus Voltage (Line to Neutral)
  mainsBusVoltageL1N?: number;
  mainsBusVoltageL2N?: number;
  mainsBusVoltageL3N?: number;

  // Mains/Bus Voltage (Line to Line)
  mainsBusVoltageL1L2?: number;
  mainsBusVoltageL2L3?: number;
  mainsBusVoltageL3L1?: number;

  // Mains Current
  mainsL1Current?: number;

  // Mains Import
  mainsImportP?: number;
  mainsImportQ?: number;

  // Mains Power Factor
  mainsPF?: number;

  // Vector Shift and ROCOF
  maxVectorShift?: number;
  rocof?: number;
  maxRocof?: number;

  // Load
  loadP?: number;
  loadQ?: number;
  loadPF?: number;

  // Battery and D+
  batteryVolts?: number;
  dPlus?: number;

  // Oil
  oilPressure?: number;
  oilTemperature?: number;

  // Fuel Level
  fuelLevel?: number;

  // E-STOP (Binary)
  eStop?: boolean;

  // Alarm string from device
  alarm?: string;

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
