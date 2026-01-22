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
    private static final int MIN_DATA_POINTS = 3; // Minimum telemetry points for calculation (reduced for flexibility)
    private static final double MIN_FUEL_CHANGE_THRESHOLD = 0.2; // Minimum 0.2% fuel change to consider valid (more sensitive)

    @Autowired
    private TelemetryHistoryRepository telemetryHistoryRepository;

    @Autowired
    private DeviceRepository deviceRepository;

    /**
     * Calculate fuel burn rate in percentage per hour (doesn't require tank capacity)
     * This is the primary method - works with any generator
     * @param deviceId Device identifier
     * @param analysisWindowHours Time window to analyze
     * @return Fuel burn rate in % per hour, or null if insufficient data
     */
    public Double calculateFuelBurnRatePercent(String deviceId, Integer analysisWindowHours) {
        logger.info("Calculating fuel burn rate (% per hour) for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

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

        // Ignore if fuel didn't change significantly
        if (Math.abs(fuelChangePercent) < MIN_FUEL_CHANGE_THRESHOLD) {
            logger.info("Fuel level change too small ({} %), considering stable", fuelChangePercent);
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

        // Calculate burn rate in % per hour
        double burnRatePercentPerHour = fuelChangePercent / hoursElapsed;

        logger.info("Fuel burn rate calculated: {}% per hour (fuel change: {}%, time: {} h)",
                burnRatePercentPerHour, fuelChangePercent, hoursElapsed);

        return burnRatePercentPerHour;
    }

    /**
     * Calculate fuel burn rate in liters per hour (requires tank capacity)
     * This is more accurate when tank capacity is known
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

        // Try progressively longer time windows: 5min -> 15min -> 1hour
        int[] minuteWindows = {5, 15, 60};

        for (int minutes : minuteWindows) {
            LocalDateTime recentTime = LocalDateTime.now().minusMinutes(minutes);
            List<TelemetryHistory> recentRecords = telemetryHistoryRepository
                    .findByDeviceAndTimeRange(device, recentTime, LocalDateTime.now());

            if (!recentRecords.isEmpty()) {
                // Get most recent fuel level
                Double fuelLevel = recentRecords.stream()
                        .filter(r -> r.getFuelLevel() != null && r.getFuelLevel() > 0)
                        .findFirst()
                        .map(TelemetryHistory::getFuelLevel)
                        .orElse(null);

                if (fuelLevel != null) {
                    logger.info("Found fuel level: {}% (from last {} minutes)", fuelLevel, minutes);
                    return fuelLevel;
                }
            }
        }

        logger.warn("No recent telemetry data with fuel level found for device: {}", deviceId);
        return null;
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

    /**
     * Calculate fuel burn rate with adaptive time window (percentage-based)
     * Tries progressively shorter windows: 2h -> 1h -> 30m -> 15m
     * This doesn't require tank capacity - works with any generator!
     * @param deviceId Device identifier
     * @return Fuel burn rate in % per hour, or null if no data available
     */
    public Double calculateFuelBurnRatePercentAdaptive(String deviceId) {
        logger.info("Calculating fuel burn rate (% per hour) with adaptive window for device: {}", deviceId);

        // Try different time windows
        int[] windows = {2, 1}; // hours
        for (int windowHours : windows) {
            Double burnRate = calculateFuelBurnRatePercent(deviceId, windowHours);
            if (burnRate != null && burnRate > 0) {
                logger.info("Adaptive calculation succeeded with {} hour window: {}% per hour", windowHours, burnRate);
                return burnRate;
            }
        }

        // Try shorter windows in minutes
        int[] minuteWindows = {30, 15};
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        for (int minutes : minuteWindows) {
            LocalDateTime startTime = LocalDateTime.now().minusMinutes(minutes);
            LocalDateTime endTime = LocalDateTime.now();

            List<TelemetryHistory> records = telemetryHistoryRepository
                    .findByDeviceAndTimeRange(device, startTime, endTime);

            if (records.size() >= 2) {
                records.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

                TelemetryHistory first = records.get(0);
                TelemetryHistory last = records.get(records.size() - 1);

                if (first.getFuelLevel() != null && last.getFuelLevel() != null) {
                    double fuelChange = first.getFuelLevel() - last.getFuelLevel();
                    if (fuelChange > 0.1) { // At least 0.1% change
                        Duration duration = Duration.between(first.getTimestamp(), last.getTimestamp());
                        double hoursElapsed = duration.toMinutes() / 60.0;

                        if (hoursElapsed > 0.05) { // At least 3 minutes
                            double burnRate = fuelChange / hoursElapsed;
                            logger.info("Adaptive calculation succeeded with {} minute window: {}% per hour", minutes, burnRate);
                            return burnRate;
                        }
                    }
                }
            }
        }

        logger.warn("Adaptive calculation failed for all time windows");
        return null;
    }

    /**
     * Calculate fuel burn rate with adaptive time window (liters-based - requires tank capacity)
     * Tries progressively shorter windows: 2h -> 1h -> 30m -> 15m
     * @param deviceId Device identifier
     * @return Fuel burn rate in L/h, or null if no data available
     */
    public Double calculateFuelBurnRateAdaptive(String deviceId) {
        logger.info("Calculating fuel burn rate with adaptive window for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Need tank capacity for liter-based calculation
        if (device.getFuelTankCapacityLiters() == null || device.getFuelTankCapacityLiters() <= 0) {
            logger.info("Tank capacity not configured, falling back to percentage-based calculation");
            return null;
        }

        // Try different time windows
        int[] windows = {2, 1}; // hours
        for (int windowHours : windows) {
            Double burnRate = calculateFuelBurnRate(deviceId, windowHours);
            if (burnRate != null && burnRate > 0) {
                logger.info("Adaptive calculation succeeded with {} hour window: {} L/h", windowHours, burnRate);
                return burnRate;
            }
        }

        // Try shorter windows in minutes
        int[] minuteWindows = {30, 15};

        for (int minutes : minuteWindows) {
            LocalDateTime startTime = LocalDateTime.now().minusMinutes(minutes);
            LocalDateTime endTime = LocalDateTime.now();

            List<TelemetryHistory> records = telemetryHistoryRepository
                    .findByDeviceAndTimeRange(device, startTime, endTime);

            if (records.size() >= 2) {
                records.sort((a, b) -> a.getTimestamp().compareTo(b.getTimestamp()));

                TelemetryHistory first = records.get(0);
                TelemetryHistory last = records.get(records.size() - 1);

                if (first.getFuelLevel() != null && last.getFuelLevel() != null) {
                    double fuelChange = first.getFuelLevel() - last.getFuelLevel();
                    if (fuelChange > 0.1) { // At least 0.1% change
                        Duration duration = Duration.between(first.getTimestamp(), last.getTimestamp());
                        double hoursElapsed = duration.toMinutes() / 60.0;

                        if (hoursElapsed > 0.05) { // At least 3 minutes
                            double fuelConsumed = (fuelChange / 100.0) * device.getFuelTankCapacityLiters();
                            double burnRate = fuelConsumed / hoursElapsed;
                            logger.info("Adaptive calculation succeeded with {} minute window: {} L/h", minutes, burnRate);
                            return burnRate;
                        }
                    }
                }
            }
        }

        logger.warn("Adaptive calculation failed for all time windows");
        return null;
    }

    /**
     * Estimate fuel burn rate in percentage per hour based on typical generator efficiency
     * Used as fallback when no historical data is available
     * @param deviceId Device identifier
     * @return Estimated burn rate in % per hour
     */
    public Double estimateFuelBurnRatePercent(String deviceId) {
        logger.info("Estimating fuel burn rate (% per hour) based on typical efficiency for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Get current average load
        Double avgLoadKw = calculateAverageLoad(deviceId, 1); // Last 1 hour

        if (avgLoadKw == null || avgLoadKw <= 0) {
            // No load data available
            if (device.getGeneratorCapacityKw() != null && device.getGeneratorCapacityKw() > 0) {
                // Assume 50% load as default
                avgLoadKw = device.getGeneratorCapacityKw() * 0.5;
                logger.info("No load data available, assuming 50% load: {} kW", avgLoadKw);
            } else {
                // Use typical medium-size generator assumption
                avgLoadKw = 100.0; // 100 kW default
                logger.warn("No generator capacity configured, using default load estimate: {} kW", avgLoadKw);
            }
        }

        // Typical diesel generator efficiency:
        // Full load: ~8-10 hours per full tank
        // 50% load: ~12-16 hours per full tank
        // We use: runtime_hours = 100 / (load_factor × base_consumption_rate)
        // Where base_consumption_rate ≈ 10% per hour at full load

        double loadFactor = 1.0; // Assume full load by default
        if (device.getGeneratorCapacityKw() != null && device.getGeneratorCapacityKw() > 0) {
            loadFactor = avgLoadKw / device.getGeneratorCapacityKw();
        } else {
            // Assume 50% load factor if capacity unknown
            loadFactor = 0.5;
        }

        // Base consumption: 10% per hour at full load (10 hours runtime)
        // Adjust based on load factor (lower load = lower consumption)
        double baseConsumptionPercentPerHour = 10.0; // % per hour at full load
        double estimatedBurnRate = baseConsumptionPercentPerHour * loadFactor;

        // Ensure reasonable bounds (1-15% per hour)
        estimatedBurnRate = Math.max(1.0, Math.min(15.0, estimatedBurnRate));

        logger.info("Estimated fuel burn rate: {}% per hour (load: {} kW, factor: {})",
                estimatedBurnRate, avgLoadKw, loadFactor);

        return estimatedBurnRate;
    }

    /**
     * Estimate fuel burn rate based on generator specifications and current load (requires tank capacity)
     * Used as fallback when no historical data is available
     * @param deviceId Device identifier
     * @return Estimated burn rate in L/h
     */
    public Double estimateFuelBurnRate(String deviceId) {
        logger.info("Estimating fuel burn rate based on generator specs for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Need tank capacity for liter-based estimation
        if (device.getFuelTankCapacityLiters() == null || device.getFuelTankCapacityLiters() <= 0) {
            return null;
        }

        // Get current average load
        Double avgLoadKw = calculateAverageLoad(deviceId, 1); // Last 1 hour

        if (avgLoadKw == null || avgLoadKw <= 0) {
            // No load data, use generator capacity to estimate
            if (device.getGeneratorCapacityKw() != null && device.getGeneratorCapacityKw() > 0) {
                // Assume 50% load as default
                avgLoadKw = device.getGeneratorCapacityKw() * 0.5;
                logger.info("No load data available, assuming 50% load: {} kW", avgLoadKw);
            } else {
                // No generator capacity configured, use a conservative default
                avgLoadKw = 100.0; // 100 kW default
                logger.warn("No generator capacity configured, using default load estimate: {} kW", avgLoadKw);
            }
        }

        // Typical diesel generator fuel consumption formula:
        // Fuel consumption (L/h) ≈ Load (kW) × 0.25 L/kWh
        // This is a conservative estimate (actual varies by generator efficiency)
        double estimatedBurnRate = avgLoadKw * 0.25;

        logger.info("Estimated fuel burn rate: {} L/h based on {} kW load", estimatedBurnRate, avgLoadKw);

        return estimatedBurnRate;
    }
}
