package com.generator.monitoring.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.generator.monitoring.dto.AlarmData;
import com.generator.monitoring.dto.DeviceDataMessage;
import com.generator.monitoring.dto.TelemetryData;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.repository.DeviceRepository;
import org.eclipse.paho.client.mqttv3.IMqttMessageListener;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MqttService implements IMqttMessageListener {

    private static final Logger logger = LoggerFactory.getLogger(MqttService.class);

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private ThresholdService thresholdService;

    @Autowired
    private WebSocketService webSocketService;

    private final ObjectMapper objectMapper;

    public MqttService() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void messageArrived(String topic, MqttMessage message) {
        try {
            logger.info("Received MQTT message on topic: {}", topic);

            // Extract device ID from topic (format: generator/{deviceId}/data)
            String deviceId = extractDeviceIdFromTopic(topic);

            if (deviceId == null) {
                logger.error("Invalid topic format: {}", topic);
                return;
            }

            // Validate device exists
            Device device = deviceRepository.findByDeviceId(deviceId).orElse(null);

            if (device == null) {
                logger.warn("Unknown device: {}. Creating new device entry.", deviceId);
                device = createNewDevice(deviceId);
            }

            // Update last seen timestamp
            device.setLastSeenAt(LocalDateTime.now());
            deviceRepository.save(device);

            // Parse telemetry data
            String payload = new String(message.getPayload());
            logger.debug("Payload: {}", payload);

            TelemetryData telemetryData = objectMapper.readValue(payload, TelemetryData.class);
            telemetryData.setDeviceId(deviceId);

            if (telemetryData.getTimestamp() == null) {
                telemetryData.setTimestamp(LocalDateTime.now());
            }

            // Evaluate thresholds and generate backend alarms
            List<AlarmData> backendAlarms = thresholdService.evaluateThresholds(device, telemetryData);

            // Create message with telemetry and alarms
            DeviceDataMessage dataMessage = new DeviceDataMessage(telemetryData, backendAlarms);

            // Forward data to WebSocket clients
            webSocketService.sendDeviceData(deviceId, dataMessage);

            logger.info("Processed telemetry for device: {}", deviceId);

        } catch (Exception e) {
            logger.error("Error processing MQTT message: {}", e.getMessage(), e);
        }
    }

    private String extractDeviceIdFromTopic(String topic) {
        // Topic format: generator/{deviceId}/data
        String[] parts = topic.split("/");
        if (parts.length == 3 && parts[0].equals("generator") && parts[2].equals("data")) {
            return parts[1];
        }
        return null;
    }

    private Device createNewDevice(String deviceId) {
        Device device = new Device();
        device.setDeviceId(deviceId);
        device.setName("Generator " + deviceId);
        device.setLocation("Unknown");
        device.setActive(true);
        return deviceRepository.save(device);
    }
}
