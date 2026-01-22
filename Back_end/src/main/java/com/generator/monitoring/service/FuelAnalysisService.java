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
public class FuelAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(FuelAnalysisService.class);

    private static final int DEFAULT_ANALYSIS_WINDOW_HOURS = 2; // Analyze last 2 hours
    private static final int MIN_DATA_POINTS = 5; // Minimum telemetry points for reliable calculation
    private static final double MIN_FUEL_CHANGE_THRESHOLD = 0.5; // Minimum 0.5% fuel change to consider valid

    @Autowired
    private TelemetryHistoryRepository telemetryHistoryRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    /**
     * Calculate fuel burn rate in liters per hour
     * @param deviceId Device identifier
     * @param analysisWindowHours Time window to analyze (default 2 hours)
     * @return Fuel burn rate in L/h, or null if insufficient data
     */
    public Double calculateFuelBurnRate(String deviceId, Integer analysisWindowHours) {
        logger.info("Calculating fuel burn rate for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Check if device has fuel tank capacity configured
        if (device.getFuelTankCapacityLiters() == null || device.getFuelTankCapacityLiters() <= 0) {
            logger.warn("Device {} has no fuel tank capacity configured", deviceId);
            return null;
        }

        int windowHours = (analysisWindowHours != null) ? analysisWindowHours : DEFAULT_ANALYSIS_WINDOW_HOURS;
        LocalDateTime startTime = LocalDateTime.now().minusHours(windowHours);
        LocalDateTime endTime = LocalDateTime.now();

        List<TelemetryHistory> records = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, endTime);

        if (records.isEmpty() || records.size() < MIN_DATA_POINTS) {
            logger.warn("Insufficient data points for fuel burn rate calculation: {} records", records.size());
            return null;
        }

        // Sort by timestamp ascending
        records.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

        // Get first and last valid readings
        TelemetryHistory firstReading = null;
        TelemetryHistory lastReading = null;

        for (TelemetryHistory record : records) {
            if (record.getFuelLevel() != null && record.getFuelLevel() > 0) {
                if (firstReading == null) {
                    firstReading = record;
                }
                lastReading = record;
            }
        }

        if (firstReading == null || lastReading == null || firstReading.equals(lastReading)) {
            logger.warn("No valid fuel level readings found in time range");
            return null;
        }

        double fuelChangePercent = firstReading.getFuelLevel() - lastReading.getFuelLevel();

        // Ignore if fuel didn't change significantly (might be noise or refueling)
        if (Math.abs(fuelChangePercent) < MIN_FUEL_CHANGE_THRESHOLD) {
            logger.info("Fuel level change too small ({} %), using default rate", fuelChangePercent);
            return null;
        }

        // Check for refueling (fuel level increased)
        if (fuelChangePercent < 0) {
            logger.info("Fuel level increased - possible refueling detected, cannot calculate burn rate");
            return null;
        }

        // Calculate time difference in hours
        Duration duration = Duration.between(firstReading.getTimestamp(), lastReading.getTimestamp());
        double hoursElapsed = duration.toMinutes() / 60.0;

        if (hoursElapsed < 0.1) { // Less than 6 minutes
            logger.warn("Time window too small: {} hours", hoursElapsed);
            return null;
        }

        // Calculate burn rate
        double fuelConsumedLiters = (fuelChangePercent / 100.0) * device.getFuelTankCapacityLiters();
        double burnRateLitersPerHour = fuelConsumedLiters / hoursElapsed;

        logger.info("Fuel burn rate calculated: {} L/h (fuel change: {}%, time: {} h)",
                burnRateLitersPerHour, fuelChangePercent, hoursElapsed);

        return burnRateLitersPerHour;
    }

    /**
     * Calculate average load (power output) over analysis window
     * @param deviceId Device identifier
     * @param analysisWindowHours Time window to analyze
     * @return Average load in kW, or null if insufficient data
     */
    public Double calculateAverageLoad(String deviceId, Integer analysisWindowHours) {
        logger.info("Calculating average load for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        int windowHours = (analysisWindowHours != null) ? analysisWindowHours : DEFAULT_ANALYSIS_WINDOW_HOURS;
        LocalDateTime startTime = LocalDateTime.now().minusHours(windowHours);
        LocalDateTime endTime = LocalDateTime.now();

        List<TelemetryHistory> records = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, endTime);

        if (records.isEmpty()) {
            logger.warn("No telemetry data found for average load calculation");
            return null;
        }

        // Calculate total power across all three phases
        double sumPower = 0;
        int validCount = 0;

        for (TelemetryHistory record : records) {
            double totalPower = 0;
            int phaseCount = 0;

            if (record.getGeneratorPL1() != null && record.getGeneratorPL1() > 0) {
                totalPower += record.getGeneratorPL1();
                phaseCount++;
            }
            if (record.getGeneratorPL2() != null && record.getGeneratorPL2() > 0) {
                totalPower += record.getGeneratorPL2();
                phaseCount++;
            }
            if (record.getGeneratorPL3() != null && record.getGeneratorPL3() > 0) {
                totalPower += record.getGeneratorPL3();
                phaseCount++;
            }

            if (phaseCount > 0) {
                sumPower += totalPower;
                validCount++;
            }
        }

        if (validCount == 0) {
            logger.warn("No valid power readings found");
            return null;
        }

        double avgLoadKw = sumPower / validCount;
        logger.info("Average load calculated: {} kW from {} readings", avgLoadKw, validCount);

        return avgLoadKw;
    }

    /**
     * Get current fuel level percentage
     * @param deviceId Device identifier
     * @return Current fuel level %, or null if not available
     */
    public Double getCurrentFuelLevel(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        LocalDateTime recentTime = LocalDateTime.now().minusMinutes(5); // Last 5 minutes
        List<TelemetryHistory> recentRecords = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, recentTime, LocalDateTime.now());

        if (recentRecords.isEmpty()) {
            logger.warn("No recent telemetry data found for device: {}", deviceId);
            return null;
        }

        // Get most recent fuel level
        return recentRecords.stream()
                .filter(r -> r.getFuelLevel() != null)
                .findFirst()
                .map(TelemetryHistory::getFuelLevel)
                .orElse(null);
    }

    /**
     * Estimate if fuel consumption pattern is stable
     * Returns true if fuel consumption is consistent, false if erratic
     */
    public boolean isFuelConsumptionStable(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        LocalDateTime startTime = LocalDateTime.now().minusHours(4); // Last 4 hours
        List<TelemetryHistory> records = telemetryHistoryRepository
                .findByDeviceAndTimeRange(device, startTime, LocalDateTime.now());

        if (records.size() < 10) {
            return false; // Not enough data
        }

        // Check if fuel level is monotonically decreasing (stable consumption)
        records.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

        int decreaseCount = 0;
        int totalTransitions = 0;

        for (int i = 1; i < records.size(); i++) {
            Double prev = records.get(i - 1).getFuelLevel();
            Double curr = records.get(i).getFuelLevel();

            if (prev != null && curr != null && Math.abs(prev - curr) > 0.1) {
                totalTransitions++;
                if (curr < prev) {
                    decreaseCount++;
                }
            }
        }

        // If > 80% of transitions are decreasing, consumption is stable
        return totalTransitions > 0 && ((double) decreaseCount / totalTransitions) > 0.8;
    }
}
