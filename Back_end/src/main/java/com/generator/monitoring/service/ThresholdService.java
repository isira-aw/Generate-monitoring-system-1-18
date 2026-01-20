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
            // For grouped parameters, check all related values
            List<ValueWithLabel> values = getValuesForParameter(telemetry, threshold.getParameter());

            for (ValueWithLabel valueWithLabel : values) {
                Double value = valueWithLabel.value;
                String label = valueWithLabel.label;

                if (value != null) {
                    if (value < threshold.getMinValue()) {
                        alarms.add(createAlarm(
                                device.getDeviceId(),
                                threshold.getParameter().name(),
                                String.format("%s %s is below minimum threshold (%.2f %s)",
                                        threshold.getParameter().getDisplayName(),
                                        label,
                                        threshold.getMinValue(),
                                        threshold.getUnit()),
                                "WARNING",
                                value
                        ));
                    } else if (value > threshold.getMaxValue()) {
                        alarms.add(createAlarm(
                                device.getDeviceId(),
                                threshold.getParameter().name(),
                                String.format("%s %s is above maximum threshold (%.2f %s)",
                                        threshold.getParameter().getDisplayName(),
                                        label,
                                        threshold.getMaxValue(),
                                        threshold.getUnit()),
                                "CRITICAL",
                                value
                        ));
                    }
                }
            }
        }

        return alarms;
    }

    // Helper class to hold value with its label
    private static class ValueWithLabel {
        Double value;
        String label;

        ValueWithLabel(Double value, String label) {
            this.value = value;
            this.label = label;
        }
    }

    private List<ValueWithLabel> getValuesForParameter(TelemetryData telemetry, ThresholdParameter parameter) {
        List<ValueWithLabel> values = new ArrayList<>();

        switch (parameter) {
            case RPM -> values.add(new ValueWithLabel(telemetry.getRpm(), ""));

            case GENERATOR_FREQUENCY -> values.add(new ValueWithLabel(telemetry.getGeneratorFrequency(), ""));

            case MAINS_BUS_FREQUENCY -> values.add(new ValueWithLabel(telemetry.getMainsBusFrequency(), ""));

            case GENERATOR_VOLTAGE_LN -> {
                values.add(new ValueWithLabel(telemetry.getGeneratorVoltageL1N(), "L1-N"));
                values.add(new ValueWithLabel(telemetry.getGeneratorVoltageL2N(), "L2-N"));
                values.add(new ValueWithLabel(telemetry.getGeneratorVoltageL3N(), "L3-N"));
            }

            case GENERATOR_VOLTAGE_LL -> {
                values.add(new ValueWithLabel(telemetry.getGeneratorVoltageL1L2(), "L1-L2"));
                values.add(new ValueWithLabel(telemetry.getGeneratorVoltageL2L3(), "L2-L3"));
                values.add(new ValueWithLabel(telemetry.getGeneratorVoltageL3L1(), "L3-L1"));
            }

            case MAINS_BUS_VOLTAGE_LN -> {
                values.add(new ValueWithLabel(telemetry.getMainsBusVoltageL1N(), "L1-N"));
                values.add(new ValueWithLabel(telemetry.getMainsBusVoltageL2N(), "L2-N"));
                values.add(new ValueWithLabel(telemetry.getMainsBusVoltageL3N(), "L3-N"));
            }

            case MAINS_BUS_VOLTAGE_LL -> {
                values.add(new ValueWithLabel(telemetry.getMainsBusVoltageL1L2(), "L1-L2"));
                values.add(new ValueWithLabel(telemetry.getMainsBusVoltageL2L3(), "L2-L3"));
                values.add(new ValueWithLabel(telemetry.getMainsBusVoltageL3L1(), "L3-L1"));
            }

            case GENERATOR_CURRENT -> {
                values.add(new ValueWithLabel(telemetry.getGeneratorCurrentL1(), "L1"));
                values.add(new ValueWithLabel(telemetry.getGeneratorCurrentL2(), "L2"));
                values.add(new ValueWithLabel(telemetry.getGeneratorCurrentL3(), "L3"));
            }

            case REAL_POWER -> {
                // Calculate average of L1, L2, L3 for Generator P
                Double genP = calculateAverage(
                    telemetry.getGeneratorPL1(),
                    telemetry.getGeneratorPL2(),
                    telemetry.getGeneratorPL3()
                );
                values.add(new ValueWithLabel(genP, "(Generator)"));
                values.add(new ValueWithLabel(telemetry.getLoadP(), "(Load)"));
            }

            case REACTIVE_POWER -> {
                // Use total Generator Q
                values.add(new ValueWithLabel(telemetry.getGeneratorQ(), "(Generator)"));
                values.add(new ValueWithLabel(telemetry.getLoadQ(), "(Load)"));
            }

            case POWER_FACTOR -> {
                values.add(new ValueWithLabel(telemetry.getGeneratorPowerFactor(), "(Generator)"));
                values.add(new ValueWithLabel(telemetry.getMainsPF(), "(Mains)"));
                values.add(new ValueWithLabel(telemetry.getLoadPF(), "(Load)"));
            }

            case EARTH_FAULT_CURRENT -> values.add(new ValueWithLabel(telemetry.getEarthFaultCurrent(), ""));

            case ROCOF -> {
                values.add(new ValueWithLabel(telemetry.getRocof(), ""));
                values.add(new ValueWithLabel(telemetry.getMaxRocof(), "(Max)"));
            }

            case OIL_PRESSURE -> values.add(new ValueWithLabel(telemetry.getOilPressure(), ""));

            case OIL_TEMPERATURE -> values.add(new ValueWithLabel(telemetry.getOilTemperature(), ""));

            case FUEL_LEVEL -> values.add(new ValueWithLabel(telemetry.getFuelLevel(), ""));

            case BATTERY_VOLTAGE -> {
                values.add(new ValueWithLabel(telemetry.getBatteryVolts(), "(Battery)"));
                values.add(new ValueWithLabel(telemetry.getDPlus(), "(D+)"));
            }

            case E_STOP -> {
                // E-STOP is boolean, convert to 0 or 1 for threshold checking
                Double estopValue = telemetry.getEStop() != null && telemetry.getEStop() ? 1.0 : 0.0;
                values.add(new ValueWithLabel(estopValue, ""));
            }
        }

        return values;
    }

    private Double calculateAverage(Double... values) {
        double sum = 0;
        int count = 0;
        for (Double value : values) {
            if (value != null) {
                sum += value;
                count++;
            }
        }
        return count > 0 ? sum / count : null;
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
                    case RPM -> {
                        threshold.setMinValue(1400.0);
                        threshold.setMaxValue(1600.0);
                    }
                    case GENERATOR_FREQUENCY -> {
                        threshold.setMinValue(49.0);
                        threshold.setMaxValue(51.0);
                    }
                    case MAINS_BUS_FREQUENCY -> {
                        threshold.setMinValue(49.0);
                        threshold.setMaxValue(51.0);
                    }
                    case GENERATOR_VOLTAGE_LN -> {
                        threshold.setMinValue(200.0);
                        threshold.setMaxValue(250.0);
                    }
                    case GENERATOR_VOLTAGE_LL -> {
                        threshold.setMinValue(380.0);
                        threshold.setMaxValue(420.0);
                    }
                    case MAINS_BUS_VOLTAGE_LN -> {
                        threshold.setMinValue(200.0);
                        threshold.setMaxValue(250.0);
                    }
                    case MAINS_BUS_VOLTAGE_LL -> {
                        threshold.setMinValue(380.0);
                        threshold.setMaxValue(420.0);
                    }
                    case GENERATOR_CURRENT -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(100.0);
                    }
                    case REAL_POWER -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(500.0);
                    }
                    case REACTIVE_POWER -> {
                        threshold.setMinValue(-100.0);
                        threshold.setMaxValue(100.0);
                    }
                    case POWER_FACTOR -> {
                        threshold.setMinValue(0.8);
                        threshold.setMaxValue(1.0);
                    }
                    case EARTH_FAULT_CURRENT -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(1.0);
                    }
                    case ROCOF -> {
                        threshold.setMinValue(-2.0);
                        threshold.setMaxValue(2.0);
                    }
                    case OIL_PRESSURE -> {
                        threshold.setMinValue(2.0);
                        threshold.setMaxValue(6.0);
                    }
                    case OIL_TEMPERATURE -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(120.0);
                    }
                    case FUEL_LEVEL -> {
                        threshold.setMinValue(10.0);
                        threshold.setMaxValue(100.0);
                    }
                    case BATTERY_VOLTAGE -> {
                        threshold.setMinValue(22.0);
                        threshold.setMaxValue(28.0);
                    }
                    case E_STOP -> {
                        threshold.setMinValue(0.0);
                        threshold.setMaxValue(0.0); // E-STOP should always be 0 (not activated)
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
