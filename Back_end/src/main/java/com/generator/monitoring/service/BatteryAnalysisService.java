package com.generator.monitoring.service;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.TelemetryHistory;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.TelemetryHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class BatteryAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(BatteryAnalysisService.class);

    private static final int DEFAULT_ANALYSIS_WINDOW_HOURS = 2; // Analyze last 2 hours
    private static final int MIN_DATA_POINTS = 5; // Minimum telemetry points
    private static final double MIN_VOLTAGE_CHANGE_THRESHOLD = 0.1; // Minimum 0.1V change

    // Lead-acid battery discharge curve constants
    // 12V System
    private static final double VOLTAGE_12V_FULL = 12.7;
    private static final double VOLTAGE_12V_50 = 12.2;
    private static final double VOLTAGE_12V_EMPTY = 10.5;

    // 24V System
    private static final double VOLTAGE_24V_FULL = 25.4;
    private static final double VOLTAGE_24V_50 = 24.4;
    private static final double VOLTAGE_24V_EMPTY = 21.0;

    @Autowired
    private TelemetryHistoryRepository telemetryHistoryRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    /**
     * Estimate State of Charge (SOC) percentage from battery voltage
     * Uses typical lead-acid discharge curves
     * @param batteryVoltage Current battery voltage
     * @param nominalVoltage Nominal system voltage (12V or 24V)
     * @return SOC percentage (0-100), or null if voltage invalid
     */
    public Double estimateSOC(Double batteryVoltage, Double nominalVoltage) {
        if (batteryVoltage == null || nominalVoltage == null) {
            return null;
        }

        double vFull, v50, vEmpty;

        // Determine battery system voltage
        if (nominalVoltage >= 20.0) { // 24V system
            vFull = VOLTAGE_24V_FULL;
            v50 = VOLTAGE_24V_50;
            vEmpty = VOLTAGE_24V_EMPTY;
        } else { // 12V system
            vFull = VOLTAGE_12V_FULL;
            v50 = VOLTAGE_12V_50;
            vEmpty = VOLTAGE_12V_EMPTY;
        }

        // Clamp voltage to valid range
        if (batteryVoltage >= vFull) {
            return 100.0;
        }
        if (batteryVoltage <= vEmpty) {
            return 0.0;
        }

        // Piecewise linear interpolation
        // 100% to 50%: voltage drops from vFull to v50
        // 50% to 0%: voltage drops from v50 to vEmpty

        if (batteryVoltage > v50) {
            // Upper half (100% to 50%)
            double ratio = (batteryVoltage - v50) / (vFull - v50);
            return 50.0 + (ratio * 50.0);
        } else {
            // Lower half (50% to 0%)
            double ratio = (batteryVoltage - vEmpty) / (v50 - vEmpty);
            return ratio * 50.0;
        }
    }

    /**
     * Calculate battery drain rate in volts per hour
     * @param deviceId Device identifier
     * @param analysisWindowHours Time window to analyze
     * @return Battery drain rate in V/h, or null if insufficient data
     */
    public Double calculateBatteryDrainRate(String deviceId, Integer analysisWindowHours) {
        logger.info("Calculating battery drain rate for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        int windowHours = (analysisWindowHours != null) ? analysisWindowHours : DEFAULT_ANALYSIS_WINDOW_HOURS;
        LocalDateTime startTime = LocalDateTime.now().minusHours(windowHours);
        LocalDateTime endTime = LocalDateTime.now();

        List<TelemetryHistory> records = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, endTime);

        if (records.isEmpty() || records.size() < MIN_DATA_POINTS) {
            logger.warn("Insufficient data points for battery drain rate calculation: {} records", records.size());
            return null;
        }

        // Sort by timestamp ascending
        records.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

        // Get first and last valid readings
        TelemetryHistory firstReading = null;
        TelemetryHistory lastReading = null;

        for (TelemetryHistory record : records) {
            if (record.getBatteryVolts() != null && record.getBatteryVolts() > 0) {
                if (firstReading == null) {
                    firstReading = record;
                }
                lastReading = record;
            }
        }

        if (firstReading == null || lastReading == null || firstReading.equals(lastReading)) {
            logger.warn("No valid battery voltage readings found in time range");
            return null;
        }

        double voltageChange = firstReading.getBatteryVolts() - lastReading.getBatteryVolts();

        // Check if battery is charging (voltage increased)
        if (voltageChange < 0) {
            logger.info("Battery voltage increased - charging detected, cannot calculate drain rate");
            return null;
        }

        // Ignore if voltage didn't change significantly
        if (Math.abs(voltageChange) < MIN_VOLTAGE_CHANGE_THRESHOLD) {
            logger.info("Battery voltage change too small ({} V), considering stable", voltageChange);
            return 0.0; // Stable battery
        }

        // Calculate time difference in hours
        Duration duration = Duration.between(firstReading.getTimestamp(), lastReading.getTimestamp());
        double hoursElapsed = duration.toMinutes() / 60.0;

        if (hoursElapsed < 0.1) { // Less than 6 minutes
            logger.warn("Time window too small: {} hours", hoursElapsed);
            return null;
        }

        // Calculate drain rate
        double drainRateVoltsPerHour = voltageChange / hoursElapsed;

        logger.info("Battery drain rate calculated: {} V/h (voltage change: {} V, time: {} h)",
                drainRateVoltsPerHour, voltageChange, hoursElapsed);

        return drainRateVoltsPerHour;
    }

    /**
     * Get current battery voltage
     * @param deviceId Device identifier
     * @return Current battery voltage, or null if not available
     */
    public Double getCurrentBatteryVoltage(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        LocalDateTime recentTime = LocalDateTime.now().minusMinutes(5); // Last 5 minutes
        List<TelemetryHistory> recentRecords = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, recentTime, LocalDateTime.now());

        if (recentRecords.isEmpty()) {
            logger.warn("No recent telemetry data found for device: {}", deviceId);
            return null;
        }

        // Get most recent battery voltage
        return recentRecords.stream()
                .filter(r -> r.getBatteryVolts() != null && r.getBatteryVolts() > 0)
                .findFirst()
                .map(TelemetryHistory::getBatteryVolts)
                .orElse(null);
    }

    /**
     * Get current State of Charge for device
     * @param deviceId Device identifier
     * @return SOC percentage (0-100), or null if not available
     */
    public Double getCurrentSOC(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        Double currentVoltage = getCurrentBatteryVoltage(deviceId);
        if (currentVoltage == null) {
            return null;
        }

        Double nominalVoltage = device.getBatteryVoltageNominal();
        if (nominalVoltage == null) {
            // Auto-detect from current voltage
            if (currentVoltage > 20.0) {
                nominalVoltage = 24.0;
            } else {
                nominalVoltage = 12.0;
            }
            logger.info("Auto-detected battery system: {} V", nominalVoltage);
        }

        return estimateSOC(currentVoltage, nominalVoltage);
    }

    /**
     * Calculate remaining battery capacity in Amp-hours
     * @param deviceId Device identifier
     * @return Remaining capacity in Ah, or null if not calculable
     */
    public Double calculateRemainingCapacity(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        if (device.getBatteryCapacityAh() == null || device.getBatteryCapacityAh() <= 0) {
            logger.warn("Device {} has no battery capacity configured", deviceId);
            return null;
        }

        Double soc = getCurrentSOC(deviceId);
        if (soc == null) {
            return null;
        }

        return (soc / 100.0) * device.getBatteryCapacityAh();
    }

    /**
     * Estimate if battery voltage is stable (not fluctuating)
     * Returns true if voltage is consistent, false if erratic
     */
    public boolean isBatteryVoltageStable(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        LocalDateTime startTime = LocalDateTime.now().minusHours(2);
        List<TelemetryHistory> records = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, LocalDateTime.now());

        if (records.size() < 10) {
            return false; // Not enough data
        }

        // Calculate voltage variance
        List<Double> voltages = records.stream()
                .filter(r -> r.getBatteryVolts() != null && r.getBatteryVolts() > 0)
                .map(TelemetryHistory::getBatteryVolts)
                .toList();

        if (voltages.isEmpty()) {
            return false;
        }

        double mean = voltages.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double variance = voltages.stream()
                .mapToDouble(v -> Math.pow(v - mean, 2))
                .average()
                .orElse(0);

        double stdDev = Math.sqrt(variance);

        // If standard deviation < 0.5V, consider stable
        return stdDev < 0.5;
    }

    /**
     * Detect if battery is currently charging
     * @param deviceId Device identifier
     * @return true if charging detected, false otherwise
     */
    public boolean isCharging(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        LocalDateTime startTime = LocalDateTime.now().minusMinutes(30); // Last 30 minutes
        List<TelemetryHistory> records = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, LocalDateTime.now());

        if (records.size() < 3) {
            return false;
        }

        records.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

        // Check if voltage is increasing over time
        int increasingCount = 0;
        int totalTransitions = 0;

        for (int i = 1; i < records.size(); i++) {
            Double prev = records.get(i - 1).getBatteryVolts();
            Double curr = records.get(i).getBatteryVolts();

            if (prev != null && curr != null && Math.abs(curr - prev) > 0.05) {
                totalTransitions++;
                if (curr > prev) {
                    increasingCount++;
                }
            }
        }

        // If > 60% of transitions are increasing, battery is charging
        return totalTransitions > 0 && ((double) increasingCount / totalTransitions) > 0.6;
    }
}
