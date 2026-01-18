package com.generator.monitoring.service;

import com.generator.monitoring.dto.AlarmData;
import com.generator.monitoring.dto.TelemetryData;
import com.generator.monitoring.dto.ThresholdDto;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.DeviceThreshold;
import com.generator.monitoring.enums.ThresholdParameter;
import com.generator.monitoring.repository.DeviceThresholdRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class ThresholdService {

    @Autowired
    private DeviceThresholdRepository thresholdRepository;

    public List<AlarmData> evaluateThresholds(Device device, TelemetryData telemetry) {
        List<AlarmData> alarms = new ArrayList<>();
        List<DeviceThreshold> thresholds = thresholdRepository.findByDevice(device);

        for (DeviceThreshold threshold : thresholds) {
            Double value = getValueForParameter(telemetry, threshold.getParameter());

            if (value != null) {
                if (value < threshold.getMinValue()) {
                    alarms.add(createAlarm(
                            device.getDeviceId(),
                            threshold.getParameter().name(),
                            String.format("%s is below minimum threshold (%.2f %s)",
                                    threshold.getParameter().getDisplayName(),
                                    threshold.getMinValue(),
                                    threshold.getUnit()),
                            "WARNING",
                            value
                    ));
                } else if (value > threshold.getMaxValue()) {
                    alarms.add(createAlarm(
                            device.getDeviceId(),
                            threshold.getParameter().name(),
                            String.format("%s is above maximum threshold (%.2f %s)",
                                    threshold.getParameter().getDisplayName(),
                                    threshold.getMaxValue(),
                                    threshold.getUnit()),
                            "CRITICAL",
                            value
                    ));
                }
            }
        }

        return alarms;
    }

    private Double getValueForParameter(TelemetryData telemetry, ThresholdParameter parameter) {
        return switch (parameter) {
            case VOLTAGE -> telemetry.getVoltage();
            case CURRENT -> telemetry.getCurrent();
            case FREQUENCY -> telemetry.getFrequency();
            case POWER -> telemetry.getPower();
            case TEMPERATURE -> telemetry.getTemperature();
            case FUEL_LEVEL -> telemetry.getFuelLevel();
            case OIL_PRESSURE -> telemetry.getOilPressure();
            case RPM -> telemetry.getRpm();
        };
    }

    private AlarmData createAlarm(String deviceId, String parameter, String message, String severity, Double value) {
        return new AlarmData(
                deviceId,
                parameter,
                message,
                severity,
                value,
                LocalDateTime.now()
        );
    }

    public List<ThresholdDto> getDeviceThresholds(Device device) {
        List<DeviceThreshold> thresholds = thresholdRepository.findByDevice(device);
        return thresholds.stream()
                .map(this::mapToDto)
                .toList();
    }

    public ThresholdDto updateThreshold(Device device, ThresholdParameter parameter, Double minValue, Double maxValue) {
        DeviceThreshold threshold = thresholdRepository.findByDeviceAndParameter(device, parameter)
                .orElse(new DeviceThreshold());

        threshold.setDevice(device);
        threshold.setParameter(parameter);
        threshold.setMinValue(minValue);
        threshold.setMaxValue(maxValue);
        threshold.setUnit(parameter.getUnit());

        DeviceThreshold saved = thresholdRepository.save(threshold);
        return mapToDto(saved);
    }

    public void initializeDefaultThresholds(Device device) {
        // Initialize default thresholds for all parameters if they don't exist
        for (ThresholdParameter parameter : ThresholdParameter.values()) {
            if (thresholdRepository.findByDeviceAndParameter(device, parameter).isEmpty()) {
                DeviceThreshold threshold = new DeviceThreshold();
                threshold.setDevice(device);
                threshold.setParameter(parameter);
                threshold.setUnit(parameter.getUnit());

                // Set default thresholds based on parameter
                switch (parameter) {
                    case VOLTAGE -> {
                        threshold.setMinValue(200.0);
                        threshold.setMaxValue(250.0);
                    }
                    case CURRENT -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(100.0);
                    }
                    case FREQUENCY -> {
                        threshold.setMinValue(49.0);
                        threshold.setMaxValue(51.0);
                    }
                    case POWER -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(100.0);
                    }
                    case TEMPERATURE -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(95.0);
                    }
                    case FUEL_LEVEL -> {
                        threshold.setMinValue(10.0);
                        threshold.setMaxValue(100.0);
                    }
                    case OIL_PRESSURE -> {
                        threshold.setMinValue(30.0);
                        threshold.setMaxValue(80.0);
                    }
                    case RPM -> {
                        threshold.setMinValue(1400.0);
                        threshold.setMaxValue(1600.0);
                    }
                }

                thresholdRepository.save(threshold);
            }
        }
    }

    private ThresholdDto mapToDto(DeviceThreshold threshold) {
        return new ThresholdDto(
                threshold.getId(),
                threshold.getParameter(),
                threshold.getMinValue(),
                threshold.getMaxValue(),
                threshold.getUnit()
        );
    }
}
