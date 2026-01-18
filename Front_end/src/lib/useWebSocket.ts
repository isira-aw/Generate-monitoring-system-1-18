import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080/ws';

export interface TelemetryData {
  deviceId: string;
  timestamp: string;
  voltage: number;
  current: number;
  frequency: number;
  power: number;
  temperature: number;
  fuelLevel: number;
  oilPressure: number;
  rpm: number;
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
