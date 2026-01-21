package com.generator.monitoring.service;

import com.generator.monitoring.dto.HistoryDataPoint;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.TelemetryHistory;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.TelemetryHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HistoryService {

    @Autowired
    private TelemetryHistoryRepository telemetryHistoryRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    /**
     * Query historical data for a device within a time range
     * Optionally filter by specific parameters
     */
    public List<HistoryDataPoint> queryHistory(String deviceId, LocalDateTime startTime,
                                               LocalDateTime endTime, List<String> parameters) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        List<TelemetryHistory> historyRecords = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, endTime);

        return historyRecords.stream()
                .map(record -> convertToDataPoint(record, parameters))
                .collect(Collectors.toList());
    }

    /**
     * Convert TelemetryHistory to HistoryDataPoint with selected parameters
     */
    private HistoryDataPoint convertToDataPoint(TelemetryHistory record, List<String> parameters) {
        Map<String, Object> parameterMap = new HashMap<>();

        // If no specific parameters requested, return all
        if (parameters == null || parameters.isEmpty()) {
            parameters = getAllParameterNames();
        }

        for (String paramName : parameters) {
            Object value = getParameterValue(record, paramName);
            if (value != null) {
                parameterMap.put(paramName, value);
            }
        }

        return new HistoryDataPoint(record.getTimestamp(), parameterMap);
    }

    /**
     * Get all available parameter names
     */
    public List<String> getAllParameterNames() {
        return Arrays.asList(
            "rpm",
            "generatorPL1", "generatorPL2", "generatorPL3",
            "generatorQ", "generatorQL1", "generatorQL2", "generatorQL3",
            "generatorS", "generatorSL1", "generatorSL2", "generatorSL3",
            "generatorPowerFactor", "generatorFrequency",
            "generatorVoltageL1N", "generatorVoltageL2N", "generatorVoltageL3N",
            "generatorVoltageL1L2", "generatorVoltageL2L3", "generatorVoltageL3L1",
            "generatorCurrentL1", "generatorCurrentL2", "generatorCurrentL3",
            "earthFaultCurrent", "mainsBusFrequency",
            "mainsBusVoltageL1N", "mainsBusVoltageL2N", "mainsBusVoltageL3N",
            "mainsBusVoltageL1L2", "mainsBusVoltageL2L3", "mainsBusVoltageL3L1",
            "mainsL1Current", "mainsImportP", "mainsImportQ", "mainsPF",
            "maxVectorShift", "rocof", "maxRocof",
            "loadP", "loadQ", "loadPF",
            "batteryVolts", "dPlus",
            "oilPressure", "oilTemperature", "fuelLevel",
            "eStop", "alarm"
        );
    }

    /**
     * Get parameter value from TelemetryHistory using reflection
     */
    private Object getParameterValue(TelemetryHistory record, String paramName) {
        try {
            Field field = TelemetryHistory.class.getDeclaredField(paramName);
            field.setAccessible(true);
            return field.get(record);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Get parameter display names with units
     */
    public Map<String, String> getParameterDisplayNames() {
        Map<String, String> displayNames = new LinkedHashMap<>();
        displayNames.put("rpm", "RPM");
        displayNames.put("generatorPL1", "Generator P L1 (kW)");
        displayNames.put("generatorPL2", "Generator P L2 (kW)");
        displayNames.put("generatorPL3", "Generator P L3 (kW)");
        displayNames.put("generatorQ", "Generator Q (kVAR)");
        displayNames.put("generatorQL1", "Generator Q L1 (kVAR)");
        displayNames.put("generatorQL2", "Generator Q L2 (kVAR)");
        displayNames.put("generatorQL3", "Generator Q L3 (kVAR)");
        displayNames.put("generatorS", "Generator S (kVA)");
        displayNames.put("generatorSL1", "Generator S L1 (kVA)");
        displayNames.put("generatorSL2", "Generator S L2 (kVA)");
        displayNames.put("generatorSL3", "Generator S L3 (kVA)");
        displayNames.put("generatorPowerFactor", "Generator Power Factor");
        displayNames.put("generatorFrequency", "Generator Frequency (Hz)");
        displayNames.put("generatorVoltageL1N", "Generator Voltage L1-N (V)");
        displayNames.put("generatorVoltageL2N", "Generator Voltage L2-N (V)");
        displayNames.put("generatorVoltageL3N", "Generator Voltage L3-N (V)");
        displayNames.put("generatorVoltageL1L2", "Generator Voltage L1-L2 (V)");
        displayNames.put("generatorVoltageL2L3", "Generator Voltage L2-L3 (V)");
        displayNames.put("generatorVoltageL3L1", "Generator Voltage L3-L1 (V)");
        displayNames.put("generatorCurrentL1", "Generator Current L1 (A)");
        displayNames.put("generatorCurrentL2", "Generator Current L2 (A)");
        displayNames.put("generatorCurrentL3", "Generator Current L3 (A)");
        displayNames.put("earthFaultCurrent", "Earth Fault Current (mA)");
        displayNames.put("mainsBusFrequency", "Mains/Bus Frequency (Hz)");
        displayNames.put("mainsBusVoltageL1N", "Mains/Bus Voltage L1-N (V)");
        displayNames.put("mainsBusVoltageL2N", "Mains/Bus Voltage L2-N (V)");
        displayNames.put("mainsBusVoltageL3N", "Mains/Bus Voltage L3-N (V)");
        displayNames.put("mainsBusVoltageL1L2", "Mains/Bus Voltage L1-L2 (V)");
        displayNames.put("mainsBusVoltageL2L3", "Mains/Bus Voltage L2-L3 (V)");
        displayNames.put("mainsBusVoltageL3L1", "Mains/Bus Voltage L3-L1 (V)");
        displayNames.put("mainsL1Current", "Mains L1 Current (A)");
        displayNames.put("mainsImportP", "Mains Import P (kW)");
        displayNames.put("mainsImportQ", "Mains Import Q (kVAR)");
        displayNames.put("mainsPF", "Mains Power Factor");
        displayNames.put("maxVectorShift", "Max Vector Shift (°)");
        displayNames.put("rocof", "ROCOF (Hz/s)");
        displayNames.put("maxRocof", "Max ROCOF (Hz/s)");
        displayNames.put("loadP", "Load P (kW)");
        displayNames.put("loadQ", "Load Q (kVAR)");
        displayNames.put("loadPF", "Load Power Factor");
        displayNames.put("batteryVolts", "Battery Voltage (V)");
        displayNames.put("dPlus", "D+ Voltage (V)");
        displayNames.put("oilPressure", "Oil Pressure (bar)");
        displayNames.put("oilTemperature", "Oil Temperature (°C)");
        displayNames.put("fuelLevel", "Fuel Level (%)");
        displayNames.put("eStop", "E-STOP");
        displayNames.put("alarm", "Alarm");
        return displayNames;
    }
}
