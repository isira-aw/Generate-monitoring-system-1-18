package com.generator.monitoring.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.generator.monitoring.dto.AlarmData;
import com.generator.monitoring.dto.DeviceDataMessage;
import com.generator.monitoring.dto.TelemetryData;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.TelemetryHistory;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.TelemetryHistoryRepository;
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
    private TelemetryHistoryRepository telemetryHistoryRepository;

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

            // Save telemetry data to history table
            saveTelemetryHistory(device, telemetryData);

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

    /**
     * Save telemetry data to history table
     */
    private void saveTelemetryHistory(Device device, TelemetryData telemetryData) {
        try {
            TelemetryHistory history = new TelemetryHistory();
            history.setDevice(device);
            history.setTimestamp(telemetryData.getTimestamp());

            // Copy all telemetry fields
            history.setRpm(telemetryData.getRpm());

            // Generator Power
            history.setGeneratorPL1(telemetryData.getGeneratorPL1());
            history.setGeneratorPL2(telemetryData.getGeneratorPL2());
            history.setGeneratorPL3(telemetryData.getGeneratorPL3());

            // Generator Reactive Power
            history.setGeneratorQ(telemetryData.getGeneratorQ());
            history.setGeneratorQL1(telemetryData.getGeneratorQL1());
            history.setGeneratorQL2(telemetryData.getGeneratorQL2());
            history.setGeneratorQL3(telemetryData.getGeneratorQL3());

            // Generator Apparent Power
            history.setGeneratorS(telemetryData.getGeneratorS());
            history.setGeneratorSL1(telemetryData.getGeneratorSL1());
            history.setGeneratorSL2(telemetryData.getGeneratorSL2());
            history.setGeneratorSL3(telemetryData.getGeneratorSL3());

            history.setGeneratorPowerFactor(telemetryData.getGeneratorPowerFactor());
            history.setGeneratorFrequency(telemetryData.getGeneratorFrequency());

            // Generator Voltage (Line to Neutral)
            history.setGeneratorVoltageL1N(telemetryData.getGeneratorVoltageL1N());
            history.setGeneratorVoltageL2N(telemetryData.getGeneratorVoltageL2N());
            history.setGeneratorVoltageL3N(telemetryData.getGeneratorVoltageL3N());

            // Generator Voltage (Line to Line)
            history.setGeneratorVoltageL1L2(telemetryData.getGeneratorVoltageL1L2());
            history.setGeneratorVoltageL2L3(telemetryData.getGeneratorVoltageL2L3());
            history.setGeneratorVoltageL3L1(telemetryData.getGeneratorVoltageL3L1());

            // Generator Current
            history.setGeneratorCurrentL1(telemetryData.getGeneratorCurrentL1());
            history.setGeneratorCurrentL2(telemetryData.getGeneratorCurrentL2());
            history.setGeneratorCurrentL3(telemetryData.getGeneratorCurrentL3());

            history.setEarthFaultCurrent(telemetryData.getEarthFaultCurrent());
            history.setMainsBusFrequency(telemetryData.getMainsBusFrequency());

            // Mains/Bus Voltage (Line to Neutral)
            history.setMainsBusVoltageL1N(telemetryData.getMainsBusVoltageL1N());
            history.setMainsBusVoltageL2N(telemetryData.getMainsBusVoltageL2N());
            history.setMainsBusVoltageL3N(telemetryData.getMainsBusVoltageL3N());

            // Mains/Bus Voltage (Line to Line)
            history.setMainsBusVoltageL1L2(telemetryData.getMainsBusVoltageL1L2());
            history.setMainsBusVoltageL2L3(telemetryData.getMainsBusVoltageL2L3());
            history.setMainsBusVoltageL3L1(telemetryData.getMainsBusVoltageL3L1());

            history.setMainsL1Current(telemetryData.getMainsL1Current());
            history.setMainsImportP(telemetryData.getMainsImportP());
            history.setMainsImportQ(telemetryData.getMainsImportQ());
            history.setMainsPF(telemetryData.getMainsPF());

            // Vector Shift and ROCOF
            history.setMaxVectorShift(telemetryData.getMaxVectorShift());
            history.setRocof(telemetryData.getRocof());
            history.setMaxRocof(telemetryData.getMaxRocof());

            // Load
            history.setLoadP(telemetryData.getLoadP());
            history.setLoadQ(telemetryData.getLoadQ());
            history.setLoadPF(telemetryData.getLoadPF());

            // Battery and D+
            history.setBatteryVolts(telemetryData.getBatteryVolts());
            history.setDPlus(telemetryData.getDPlus());

            // Oil
            history.setOilPressure(telemetryData.getOilPressure());
            history.setOilTemperature(telemetryData.getOilTemperature());

            // Fuel Level
            history.setFuelLevel(telemetryData.getFuelLevel());

            // E-STOP
            history.setEStop(telemetryData.getEStop());

            // Alarm
            history.setAlarm(telemetryData.getAlarm());

            telemetryHistoryRepository.save(history);
            logger.debug("Saved telemetry history for device: {}", device.getDeviceId());
        } catch (Exception e) {
            logger.error("Error saving telemetry history: {}", e.getMessage(), e);
        }
    }
}
