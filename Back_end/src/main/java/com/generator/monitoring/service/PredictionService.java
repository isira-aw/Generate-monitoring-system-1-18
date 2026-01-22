package com.generator.monitoring.service;

import com.generator.monitoring.dto.PredictionResponse;
import com.generator.monitoring.entity.*;
import com.generator.monitoring.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionService {

    private static final int MAX_HISTORY_RECORDS = 10;
    private static final int MIN_RECORDS_FOR_PREDICTION = 2;

    private final DeviceRepository deviceRepository;
    private final FuelPredictionHistoryRepository fuelHistoryRepository;
    private final BatteryPredictionHistoryRepository batteryHistoryRepository;
    private final PredictionMetricsRepository predictionMetricsRepository;
    private final TelemetryHistoryRepository telemetryHistoryRepository;

    /**
     * Collect current fuel and battery data for prediction history
     * Called every 30 minutes by scheduler
     */
    @Transactional
    public void collectPredictionData(String deviceId) {
        log.info("Collecting prediction data for device: {}", deviceId);

        Optional<Device> deviceOpt = deviceRepository.findByDeviceId(deviceId);
        if (deviceOpt.isEmpty()) {
            log.warn("Device not found: {}", deviceId);
            return;
        }

        Device device = deviceOpt.get();

        // Get latest telemetry data
        List<TelemetryHistory> latestTelemetry = telemetryHistoryRepository.findLatestByDevice(device);
        if (latestTelemetry.isEmpty()) {
            log.warn("No telemetry data found for device: {}", deviceId);
            return;
        }

        TelemetryHistory latest = latestTelemetry.get(0);

        // Save fuel level if available
        if (latest.getFuelLevel() != null) {
            FuelPredictionHistory fuelHistory = new FuelPredictionHistory();
            fuelHistory.setDevice(device);
            fuelHistory.setFuelLevel(latest.getFuelLevel());
            fuelHistory.setTimestamp(LocalDateTime.now());
            fuelHistoryRepository.save(fuelHistory);
            log.info("Saved fuel level: {} for device: {}", latest.getFuelLevel(), deviceId);

            // Keep only latest 10 records
            cleanupOldRecords(device, fuelHistoryRepository);
        }

        // Save battery SOC if available (using batteryVolts as SOC percentage)
        if (latest.getBatteryVolts() != null) {
            BatteryPredictionHistory batteryHistory = new BatteryPredictionHistory();
            batteryHistory.setDevice(device);
            // Assuming batteryVolts represents SOC percentage (0-100)
            // If it's actual voltage, you may need to convert it to percentage
            batteryHistory.setBatterySoc(latest.getBatteryVolts());
            batteryHistory.setTimestamp(LocalDateTime.now());
            batteryHistoryRepository.save(batteryHistory);
            log.info("Saved battery SOC: {} for device: {}", latest.getBatteryVolts(), deviceId);

            // Keep only latest 10 records
            cleanupOldRecords(device, batteryHistoryRepository);
        }

        // Calculate and update prediction metrics
        calculateAndSavePredictions(device);
    }

    /**
     * Clean up old records, keep only latest 10
     */
    private void cleanupOldRecords(Device device, Object repository) {
        if (repository instanceof FuelPredictionHistoryRepository) {
            FuelPredictionHistoryRepository repo = (FuelPredictionHistoryRepository) repository;
            long count = repo.countByDevice(device);
            if (count > MAX_HISTORY_RECORDS) {
                repo.deleteOldestRecordsBeyondLimit(device, MAX_HISTORY_RECORDS);
            }
        } else if (repository instanceof BatteryPredictionHistoryRepository) {
            BatteryPredictionHistoryRepository repo = (BatteryPredictionHistoryRepository) repository;
            long count = repo.countByDevice(device);
            if (count > MAX_HISTORY_RECORDS) {
                repo.deleteOldestRecordsBeyondLimit(device, MAX_HISTORY_RECORDS);
            }
        }
    }

    /**
     * Calculate decline rates and predicted runtime
     */
    @Transactional
    public void calculateAndSavePredictions(Device device) {
        log.info("Calculating predictions for device: {}", device.getDeviceId());

        // Get latest fuel history
        List<FuelPredictionHistory> fuelHistory = fuelHistoryRepository
            .findTop10ByDeviceOrderByTimestampDesc(device);

        // Get latest battery history
        List<BatteryPredictionHistory> batteryHistory = batteryHistoryRepository
            .findTop10ByDeviceOrderByTimestampDesc(device);

        // Reverse to get chronological order
        Collections.reverse(fuelHistory);
        Collections.reverse(batteryHistory);

        // Calculate fuel decline rate
        Double fuelDeclineRate = calculateDeclineRate(
            fuelHistory.stream()
                .map(h -> new DataPoint(h.getTimestamp(), h.getFuelLevel()))
                .collect(Collectors.toList())
        );

        // Calculate battery decline rate
        Double batteryDeclineRate = calculateDeclineRate(
            batteryHistory.stream()
                .map(h -> new DataPoint(h.getTimestamp(), h.getBatterySoc()))
                .collect(Collectors.toList())
        );

        // Calculate predicted runtime
        Double fuelRuntimeHours = null;
        Double batteryRuntimeHours = null;

        if (fuelDeclineRate != null && !fuelHistory.isEmpty()) {
            double currentLevel = fuelHistory.get(fuelHistory.size() - 1).getFuelLevel();
            if (fuelDeclineRate > 0) {
                fuelRuntimeHours = currentLevel / fuelDeclineRate;
            }
        }

        if (batteryDeclineRate != null && !batteryHistory.isEmpty()) {
            double currentSoc = batteryHistory.get(batteryHistory.size() - 1).getBatterySoc();
            if (batteryDeclineRate > 0) {
                batteryRuntimeHours = currentSoc / batteryDeclineRate;
            }
        }

        // Save or update prediction metrics
        PredictionMetrics metrics = predictionMetricsRepository.findByDevice(device)
            .orElse(new PredictionMetrics());

        metrics.setDevice(device);
        metrics.setFuelDeclineRate(fuelDeclineRate);
        metrics.setBatteryDeclineRate(batteryDeclineRate);
        metrics.setFuelPredictedRuntimeHours(fuelRuntimeHours);
        metrics.setBatteryPredictedRuntimeHours(batteryRuntimeHours);
        metrics.setLastUpdated(LocalDateTime.now());

        predictionMetricsRepository.save(metrics);
        log.info("Saved prediction metrics for device: {}", device.getDeviceId());
    }

    /**
     * Calculate decline rate from historical data points
     * Returns percentage decline per hour
     */
    private Double calculateDeclineRate(List<DataPoint> dataPoints) {
        if (dataPoints.size() < MIN_RECORDS_FOR_PREDICTION) {
            return null;
        }

        // Simple linear regression to calculate average decline rate
        double totalDecline = 0;
        double totalHours = 0;
        int validPairs = 0;

        for (int i = 1; i < dataPoints.size(); i++) {
            DataPoint prev = dataPoints.get(i - 1);
            DataPoint current = dataPoints.get(i);

            double valueDiff = prev.value - current.value;
            Duration duration = Duration.between(prev.timestamp, current.timestamp);
            double hours = duration.toMinutes() / 60.0;

            if (hours > 0 && valueDiff >= 0) {
                totalDecline += valueDiff;
                totalHours += hours;
                validPairs++;
            }
        }

        if (validPairs == 0 || totalHours == 0) {
            return null;
        }

        // Average decline rate per hour
        return totalDecline / totalHours;
    }

    /**
     * Get prediction data for a device
     */
    @Transactional(readOnly = true)
    public PredictionResponse getPredictionData(String deviceId) {
        log.info("Getting prediction data for device: {}", deviceId);

        Optional<Device> deviceOpt = deviceRepository.findByDeviceId(deviceId);
        if (deviceOpt.isEmpty()) {
            throw new RuntimeException("Device not found: " + deviceId);
        }

        Device device = deviceOpt.get();

        // Get fuel prediction data
        PredictionResponse.FuelPredictionData fuelData = buildFuelPrediction(device);

        // Get battery prediction data
        PredictionResponse.BatteryPredictionData batteryData = buildBatteryPrediction(device);

        return PredictionResponse.builder()
            .fuelPrediction(fuelData)
            .batteryPrediction(batteryData)
            .build();
    }

    private PredictionResponse.FuelPredictionData buildFuelPrediction(Device device) {
        List<FuelPredictionHistory> history = fuelHistoryRepository
            .findTop10ByDeviceOrderByTimestampDesc(device);

        Collections.reverse(history);

        if (history.isEmpty()) {
            return PredictionResponse.FuelPredictionData.builder()
                .hasEnoughData(false)
                .message("No fuel data available")
                .historicalData(new ArrayList<>())
                .build();
        }

        double currentLevel = history.get(history.size() - 1).getFuelLevel();

        Optional<PredictionMetrics> metricsOpt = predictionMetricsRepository.findByDevice(device);

        if (metricsOpt.isEmpty() || metricsOpt.get().getFuelDeclineRate() == null) {
            return PredictionResponse.FuelPredictionData.builder()
                .currentLevel(currentLevel)
                .hasEnoughData(history.size() < MIN_RECORDS_FOR_PREDICTION)
                .message(history.size() < MIN_RECORDS_FOR_PREDICTION
                    ? "Collecting data... Need at least " + MIN_RECORDS_FOR_PREDICTION + " records"
                    : "Calculating predictions...")
                .historicalData(buildHistoricalDataPoints(history))
                .build();
        }

        PredictionMetrics metrics = metricsOpt.get();
        Double declineRate = metrics.getFuelDeclineRate();
        Double runtimeHours = metrics.getFuelPredictedRuntimeHours();
        Double runtimeMinutes = runtimeHours != null ? runtimeHours * 60 : null;
        LocalDateTime estimatedEmptyTime = runtimeHours != null
            ? LocalDateTime.now().plusMinutes(runtimeMinutes.longValue())
            : null;

        return PredictionResponse.FuelPredictionData.builder()
            .currentLevel(currentLevel)
            .declineRate(declineRate)
            .predictedRuntimeHours(runtimeHours)
            .predictedRuntimeMinutes(runtimeMinutes)
            .estimatedEmptyTime(estimatedEmptyTime)
            .hasEnoughData(true)
            .message("Prediction based on " + history.size() + " data points")
            .historicalData(buildHistoricalDataPoints(history))
            .build();
    }

    private PredictionResponse.BatteryPredictionData buildBatteryPrediction(Device device) {
        List<BatteryPredictionHistory> history = batteryHistoryRepository
            .findTop10ByDeviceOrderByTimestampDesc(device);

        Collections.reverse(history);

        if (history.isEmpty()) {
            return PredictionResponse.BatteryPredictionData.builder()
                .hasEnoughData(false)
                .message("No battery data available")
                .historicalData(new ArrayList<>())
                .build();
        }

        double currentSoc = history.get(history.size() - 1).getBatterySoc();

        Optional<PredictionMetrics> metricsOpt = predictionMetricsRepository.findByDevice(device);

        if (metricsOpt.isEmpty() || metricsOpt.get().getBatteryDeclineRate() == null) {
            return PredictionResponse.BatteryPredictionData.builder()
                .currentSoc(currentSoc)
                .hasEnoughData(history.size() < MIN_RECORDS_FOR_PREDICTION)
                .message(history.size() < MIN_RECORDS_FOR_PREDICTION
                    ? "Collecting data... Need at least " + MIN_RECORDS_FOR_PREDICTION + " records"
                    : "Calculating predictions...")
                .historicalData(buildHistoricalDataPoints(history))
                .build();
        }

        PredictionMetrics metrics = metricsOpt.get();
        Double declineRate = metrics.getBatteryDeclineRate();
        Double runtimeHours = metrics.getBatteryPredictedRuntimeHours();
        Double runtimeMinutes = runtimeHours != null ? runtimeHours * 60 : null;
        LocalDateTime estimatedEmptyTime = runtimeHours != null
            ? LocalDateTime.now().plusMinutes(runtimeMinutes.longValue())
            : null;

        return PredictionResponse.BatteryPredictionData.builder()
            .currentSoc(currentSoc)
            .declineRate(declineRate)
            .predictedRuntimeHours(runtimeHours)
            .predictedRuntimeMinutes(runtimeMinutes)
            .estimatedEmptyTime(estimatedEmptyTime)
            .hasEnoughData(true)
            .message("Prediction based on " + history.size() + " data points")
            .historicalData(buildHistoricalDataPoints(history))
            .build();
    }

    private List<PredictionResponse.HistoricalDataPoint> buildHistoricalDataPoints(List<?> history) {
        List<PredictionResponse.HistoricalDataPoint> dataPoints = new ArrayList<>();

        for (Object record : history) {
            if (record instanceof FuelPredictionHistory) {
                FuelPredictionHistory fuel = (FuelPredictionHistory) record;
                dataPoints.add(PredictionResponse.HistoricalDataPoint.builder()
                    .timestamp(fuel.getTimestamp())
                    .value(fuel.getFuelLevel())
                    .build());
            } else if (record instanceof BatteryPredictionHistory) {
                BatteryPredictionHistory battery = (BatteryPredictionHistory) record;
                dataPoints.add(PredictionResponse.HistoricalDataPoint.builder()
                    .timestamp(battery.getTimestamp())
                    .value(battery.getBatterySoc())
                    .build());
            }
        }

        return dataPoints;
    }

    /**
     * Helper class for data points
     */
    private static class DataPoint {
        LocalDateTime timestamp;
        Double value;

        DataPoint(LocalDateTime timestamp, Double value) {
            this.timestamp = timestamp;
            this.value = value;
        }
    }
}
