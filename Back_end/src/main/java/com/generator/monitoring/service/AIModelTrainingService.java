package com.generator.monitoring.service;

import com.generator.monitoring.entity.*;
import com.generator.monitoring.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Slf4j
public class AIModelTrainingService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private TelemetryHistoryRepository telemetryHistoryRepository;

    @Autowired
    private AIPredictionHistoryRepository predictionHistoryRepository;

    @Autowired
    private AIModelStateRepository modelStateRepository;

    private static final String FUEL_RUNTIME = "FUEL_RUNTIME";
    private static final String BATTERY_DRAIN = "BATTERY_DRAIN";

    /**
     * Scheduled batch training - runs daily at 2 AM
     */
    @Scheduled(cron = "0 0 2 * * ?") // Daily at 2 AM
    public void scheduledTraining() {
        log.info("Starting scheduled AI model training...");
        List<Device> devices = deviceRepository.findAll();

        for (Device device : devices) {
            try {
                trainFuelRuntimeModel(device);
                trainBatteryDrainModel(device);
            } catch (Exception e) {
                log.error("Error training models for device {}: {}", device.getDeviceId(), e.getMessage());
            }
        }

        log.info("Scheduled AI model training completed");
    }

    /**
     * Train fuel runtime prediction model for a device
     */
    @Transactional
    public void trainFuelRuntimeModel(Device device) {
        log.info("Training fuel runtime model for device: {}", device.getDeviceId());

        // Get historical telemetry data (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime now = LocalDateTime.now();

        List<TelemetryHistory> telemetryData = telemetryHistoryRepository.findByDeviceAndTimeRange(
                device, thirtyDaysAgo, now);

        if (telemetryData.size() < 50) {
            log.warn("Not enough telemetry data for training fuel runtime model for device {}", device.getDeviceId());
            return;
        }

        // Prepare training data
        int n = telemetryData.size();
        double[] fuelLevels = new double[n];
        double[] loadPowers = new double[n];
        double[] rpms = new double[n];
        double[] actualRuntimes = new double[n];

        for (int i = 0; i < n; i++) {
            TelemetryHistory t = telemetryData.get(i);
            fuelLevels[i] = t.getFuelLevel() != null ? t.getFuelLevel() : 0.0;
            loadPowers[i] = (t.getGeneratorPL1() != null ? t.getGeneratorPL1() : 0.0) +
                           (t.getGeneratorPL2() != null ? t.getGeneratorPL2() : 0.0) +
                           (t.getGeneratorPL3() != null ? t.getGeneratorPL3() : 0.0);
            rpms[i] = t.getRpm() != null ? t.getRpm() : 0.0;

            // Calculate actual runtime from historical fuel consumption
            // Look ahead to find when fuel runs out or next refuel
            actualRuntimes[i] = calculateActualRuntime(telemetryData, i);
        }

        // Perform linear regression
        // We want to learn correction factors for: y = c0 + c1*fuel + c2*load + c3*rpm
        double[] coefficients = multipleLinearRegression(
                new double[][]{fuelLevels, loadPowers, rpms},
                actualRuntimes
        );

        // Calculate model metrics
        double[] errors = new double[n];
        for (int i = 0; i < n; i++) {
            double prediction = coefficients[0] +
                              coefficients[1] * fuelLevels[i] +
                              coefficients[2] * loadPowers[i] +
                              coefficients[3] * rpms[i];
            errors[i] = Math.abs(prediction - actualRuntimes[i]);
        }

        double mae = calculateMeanAbsoluteError(errors);
        double rSquared = calculateRSquared(actualRuntimes, errors);

        // Save or update model state
        AIModelState modelState = modelStateRepository.findByDeviceAndType(device, FUEL_RUNTIME)
                .orElse(new AIModelState());

        modelState.setDevice(device);
        modelState.setModelType(FUEL_RUNTIME);
        modelState.setCoefficient0(coefficients[0]);
        modelState.setCoefficient1(coefficients[1]);
        modelState.setCoefficient2(coefficients[2]);
        modelState.setCoefficient3(coefficients[3]);
        modelState.setTrainingDataCount(n);
        modelState.setMeanAbsoluteError(mae);
        modelState.setRSquared(rSquared);
        modelState.setLastTrainedAt(LocalDateTime.now());

        modelStateRepository.save(modelState);

        log.info("Fuel runtime model trained for device {}: MAE={}, R²={}, n={}",
                device.getDeviceId(), mae, rSquared, n);
    }

    /**
     * Train battery drain prediction model for a device
     */
    @Transactional
    public void trainBatteryDrainModel(Device device) {
        log.info("Training battery drain model for device: {}", device.getDeviceId());

        // Get historical telemetry data (last 30 days)
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        LocalDateTime now = LocalDateTime.now();

        List<TelemetryHistory> telemetryData = telemetryHistoryRepository.findByDeviceAndTimeRange(
                device, thirtyDaysAgo, now);

        if (telemetryData.size() < 50) {
            log.warn("Not enough telemetry data for training battery drain model for device {}", device.getDeviceId());
            return;
        }

        // Prepare training data
        int n = telemetryData.size();
        double[] batteryVoltages = new double[n];
        double[] loadPowers = new double[n];
        double[] actualDrainTimes = new double[n];

        for (int i = 0; i < n; i++) {
            TelemetryHistory t = telemetryData.get(i);
            batteryVoltages[i] = t.getBatteryVolts() != null ? t.getBatteryVolts() : 0.0;
            loadPowers[i] = (t.getGeneratorPL1() != null ? t.getGeneratorPL1() : 0.0) +
                           (t.getGeneratorPL2() != null ? t.getGeneratorPL2() : 0.0) +
                           (t.getGeneratorPL3() != null ? t.getGeneratorPL3() : 0.0);

            // Calculate actual battery drain time from voltage drop patterns
            actualDrainTimes[i] = calculateActualBatteryDrain(telemetryData, i);
        }

        // Perform linear regression
        // We want to learn correction factors for: y = c0 + c1*voltage + c2*load
        double[] coefficients = multipleLinearRegression(
                new double[][]{batteryVoltages, loadPowers},
                actualDrainTimes
        );

        // Calculate model metrics
        double[] errors = new double[n];
        for (int i = 0; i < n; i++) {
            double prediction = coefficients[0] +
                              coefficients[1] * batteryVoltages[i] +
                              coefficients[2] * loadPowers[i];
            errors[i] = Math.abs(prediction - actualDrainTimes[i]);
        }

        double mae = calculateMeanAbsoluteError(errors);
        double rSquared = calculateRSquared(actualDrainTimes, errors);

        // Save or update model state
        AIModelState modelState = modelStateRepository.findByDeviceAndType(device, BATTERY_DRAIN)
                .orElse(new AIModelState());

        modelState.setDevice(device);
        modelState.setModelType(BATTERY_DRAIN);
        modelState.setCoefficient0(coefficients[0]);
        modelState.setCoefficient1(coefficients[1]);
        modelState.setCoefficient2(coefficients[2]);
        modelState.setCoefficient3(0.0); // Not used for battery model
        modelState.setTrainingDataCount(n);
        modelState.setMeanAbsoluteError(mae);
        modelState.setRSquared(rSquared);
        modelState.setLastTrainedAt(LocalDateTime.now());

        modelStateRepository.save(modelState);

        log.info("Battery drain model trained for device {}: MAE={}, R²={}, n={}",
                device.getDeviceId(), mae, rSquared, n);
    }

    /**
     * Calculate actual runtime from historical fuel consumption patterns
     */
    private double calculateActualRuntime(List<TelemetryHistory> data, int startIndex) {
        if (startIndex >= data.size() - 1) return 0.0;

        TelemetryHistory start = data.get(startIndex);
        double startFuel = start.getFuelLevel() != null ? start.getFuelLevel() : 0.0;

        // Look ahead to find significant fuel drop or refuel
        for (int i = startIndex + 1; i < data.size(); i++) {
            TelemetryHistory current = data.get(i);
            double currentFuel = current.getFuelLevel() != null ? current.getFuelLevel() : 0.0;

            // Detect refuel (fuel increased significantly)
            if (currentFuel > startFuel + 10) {
                // Calculate hours between start and refuel
                long seconds = java.time.Duration.between(start.getTimestamp(), current.getTimestamp()).getSeconds();
                return seconds / 3600.0; // Convert to hours
            }

            // Detect fuel near empty
            if (currentFuel < 5) {
                long seconds = java.time.Duration.between(start.getTimestamp(), current.getTimestamp()).getSeconds();
                return seconds / 3600.0;
            }
        }

        // Default: use time to last data point
        TelemetryHistory last = data.get(data.size() - 1);
        long seconds = java.time.Duration.between(start.getTimestamp(), last.getTimestamp()).getSeconds();
        return Math.min(100.0, seconds / 3600.0); // Cap at 100 hours
    }

    /**
     * Calculate actual battery drain time from voltage patterns
     */
    private double calculateActualBatteryDrain(List<TelemetryHistory> data, int startIndex) {
        if (startIndex >= data.size() - 1) return 0.0;

        TelemetryHistory start = data.get(startIndex);
        double startVoltage = start.getBatteryVolts() != null ? start.getBatteryVolts() : 0.0;

        // Look ahead to find voltage drop or recharge
        for (int i = startIndex + 1; i < data.size(); i++) {
            TelemetryHistory current = data.get(i);
            double currentVoltage = current.getBatteryVolts() != null ? current.getBatteryVolts() : 0.0;

            // Detect recharge (voltage increased significantly)
            if (currentVoltage > startVoltage + 0.5) {
                long seconds = java.time.Duration.between(start.getTimestamp(), current.getTimestamp()).getSeconds();
                return seconds / 3600.0;
            }

            // Detect critical voltage
            if (currentVoltage < 11.5) {
                long seconds = java.time.Duration.between(start.getTimestamp(), current.getTimestamp()).getSeconds();
                return seconds / 3600.0;
            }
        }

        // Default: use time to last data point
        TelemetryHistory last = data.get(data.size() - 1);
        long seconds = java.time.Duration.between(start.getTimestamp(), last.getTimestamp()).getSeconds();
        return Math.min(50.0, seconds / 3600.0); // Cap at 50 hours
    }

    /**
     * Simple multiple linear regression using least squares
     * X is a 2D array where each row is a feature
     * y is the target values
     * Returns coefficients [intercept, coef1, coef2, ...]
     */
    private double[] multipleLinearRegression(double[][] X, double[] y) {
        int n = y.length;
        int m = X.length; // Number of features

        // Calculate means
        double yMean = calculateMean(y);
        double[] xMeans = new double[m];
        for (int i = 0; i < m; i++) {
            xMeans[i] = calculateMean(X[i]);
        }

        // Build normal equations: (X^T X) β = X^T y
        // For simplicity, use a direct computation approach
        double[] coefficients = new double[m + 1]; // +1 for intercept

        // Simple approach: calculate coefficients using correlation
        // For production, would use matrix operations
        double sumYY = 0;
        double[] sumXY = new double[m];
        double[][] sumXX = new double[m][m];

        for (int i = 0; i < n; i++) {
            double yDiff = y[i] - yMean;
            sumYY += yDiff * yDiff;

            for (int j = 0; j < m; j++) {
                double xDiff = X[j][i] - xMeans[j];
                sumXY[j] += xDiff * yDiff;

                for (int k = 0; k < m; k++) {
                    sumXX[j][k] += xDiff * (X[k][i] - xMeans[k]);
                }
            }
        }

        // Simplified coefficient calculation (not full matrix inversion)
        // Using simple correlation-based approach
        for (int i = 0; i < m; i++) {
            if (sumXX[i][i] > 0) {
                coefficients[i + 1] = sumXY[i] / sumXX[i][i];
            } else {
                coefficients[i + 1] = 0;
            }
        }

        // Calculate intercept
        coefficients[0] = yMean;
        for (int i = 0; i < m; i++) {
            coefficients[0] -= coefficients[i + 1] * xMeans[i];
        }

        return coefficients;
    }

    private double calculateMean(double[] values) {
        double sum = 0;
        for (double v : values) {
            sum += v;
        }
        return sum / values.length;
    }

    private double calculateMeanAbsoluteError(double[] errors) {
        double sum = 0;
        for (double e : errors) {
            sum += Math.abs(e);
        }
        return sum / errors.length;
    }

    private double calculateRSquared(double[] actual, double[] errors) {
        double meanActual = calculateMean(actual);
        double ssTot = 0;
        double ssRes = 0;

        for (int i = 0; i < actual.length; i++) {
            ssTot += Math.pow(actual[i] - meanActual, 2);
            ssRes += Math.pow(errors[i], 2);
        }

        if (ssTot == 0) return 0;
        return 1 - (ssRes / ssTot);
    }
}
