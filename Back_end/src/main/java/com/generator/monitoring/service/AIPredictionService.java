package com.generator.monitoring.service;

import com.generator.monitoring.dto.BatteryPredictionDto;
import com.generator.monitoring.dto.PredictionDataResponse;
import com.generator.monitoring.dto.RuntimePredictionDto;
import com.generator.monitoring.entity.*;
import com.generator.monitoring.repository.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Slf4j
public class AIPredictionService {

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
     * Get predictions for a device
     */
    @Transactional
    public PredictionDataResponse getPredictions(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Get latest telemetry data
        List<TelemetryHistory> latestTelemetry = telemetryHistoryRepository.findLatestByDevice(device);

        if (latestTelemetry.isEmpty()) {
            throw new RuntimeException("No telemetry data available for device: " + deviceId);
        }

        TelemetryHistory latest = latestTelemetry.get(0);

        // Generate predictions
        RuntimePredictionDto fuelPrediction = predictFuelRuntime(device, latest);
        BatteryPredictionDto batteryPrediction = predictBatteryDrain(device, latest);

        // Get historical predictions (last 50)
        List<AIPredictionHistory> fuelHistory = predictionHistoryRepository.findLatestPredictions(device, FUEL_RUNTIME)
                .stream().limit(50).collect(Collectors.toList());

        List<AIPredictionHistory> batteryHistory = predictionHistoryRepository.findLatestPredictions(device, BATTERY_DRAIN)
                .stream().limit(50).collect(Collectors.toList());

        // Convert to DTOs
        List<RuntimePredictionDto> fuelPredictions = new ArrayList<>();
        for (AIPredictionHistory p : fuelHistory) {
            fuelPredictions.add(new RuntimePredictionDto(
                    p.getTimestamp().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
                    p.getRuleBasedPrediction(),
                    p.getAiCorrectedPrediction(),
                    p.getConfidence()
            ));
        }

        // Add latest prediction
        fuelPredictions.add(fuelPrediction);

        List<BatteryPredictionDto> batteryPredictions = new ArrayList<>();
        for (AIPredictionHistory p : batteryHistory) {
            batteryPredictions.add(new BatteryPredictionDto(
                    p.getTimestamp().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
                    p.getRuleBasedPrediction(),
                    p.getAiCorrectedPrediction(),
                    p.getConfidence()
            ));
        }

        // Add latest prediction
        batteryPredictions.add(batteryPrediction);

        // Calculate current metrics
        double currentLoad = (latest.getGeneratorPL1() != null ? latest.getGeneratorPL1() : 0.0) +
                            (latest.getGeneratorPL2() != null ? latest.getGeneratorPL2() : 0.0) +
                            (latest.getGeneratorPL3() != null ? latest.getGeneratorPL3() : 0.0);

        PredictionDataResponse response = new PredictionDataResponse();
        response.setFuelPredictions(fuelPredictions);
        response.setBatteryPredictions(batteryPredictions);
        response.setCurrentFuelLevel(latest.getFuelLevel() != null ? latest.getFuelLevel() : 0.0);
        response.setCurrentBatteryVoltage(latest.getBatteryVolts() != null ? latest.getBatteryVolts() : 0.0);
        response.setCurrentLoad(currentLoad);
        response.setLastUpdated(LocalDateTime.now().toString());

        return response;
    }

    /**
     * Predict fuel runtime using physics-based rules + AI correction
     */
    @Transactional
    public RuntimePredictionDto predictFuelRuntime(Device device, TelemetryHistory telemetry) {
        double fuelLevel = telemetry.getFuelLevel() != null ? telemetry.getFuelLevel() : 0.0;
        double loadPower = (telemetry.getGeneratorPL1() != null ? telemetry.getGeneratorPL1() : 0.0) +
                          (telemetry.getGeneratorPL2() != null ? telemetry.getGeneratorPL2() : 0.0) +
                          (telemetry.getGeneratorPL3() != null ? telemetry.getGeneratorPL3() : 0.0);
        double rpm = telemetry.getRpm() != null ? telemetry.getRpm() : 0.0;

        // Rule-based prediction (Physics-based)
        double ruleBasedRuntime = calculateRuleBasedFuelRuntime(fuelLevel, loadPower, rpm);

        // AI correction
        Optional<AIModelState> modelStateOpt = modelStateRepository.findByDeviceAndType(device, FUEL_RUNTIME);
        double aiCorrectedRuntime = ruleBasedRuntime;
        double confidence = 0.5; // Default confidence

        if (modelStateOpt.isPresent()) {
            AIModelState model = modelStateOpt.get();

            // Apply linear regression correction
            // y = c0 + c1*fuelLevel + c2*loadPower + c3*rpm
            double correction = (model.getCoefficient0() != null ? model.getCoefficient0() : 0.0) +
                               (model.getCoefficient1() != null ? model.getCoefficient1() : 0.0) * fuelLevel +
                               (model.getCoefficient2() != null ? model.getCoefficient2() : 0.0) * loadPower +
                               (model.getCoefficient3() != null ? model.getCoefficient3() : 0.0) * rpm;

            aiCorrectedRuntime = ruleBasedRuntime + correction;

            // Ensure positive runtime
            if (aiCorrectedRuntime < 0) aiCorrectedRuntime = 0;

            // Calculate confidence based on training data count and error
            if (model.getTrainingDataCount() != null && model.getTrainingDataCount() > 10) {
                confidence = Math.min(0.95, 0.5 + (model.getTrainingDataCount() / 100.0));
                if (model.getMeanAbsoluteError() != null && model.getMeanAbsoluteError() > 1.0) {
                    confidence *= 0.8; // Reduce confidence if error is high
                }
            }
        }

        // Save prediction for future training
        AIPredictionHistory prediction = new AIPredictionHistory();
        prediction.setDevice(device);
        prediction.setPredictionType(FUEL_RUNTIME);
        prediction.setFuelLevel(fuelLevel);
        prediction.setLoadPower(loadPower);
        prediction.setRpm(rpm);
        prediction.setRuleBasedPrediction(ruleBasedRuntime);
        prediction.setAiCorrectedPrediction(aiCorrectedRuntime);
        prediction.setConfidence(confidence);
        predictionHistoryRepository.save(prediction);

        long timestamp = telemetry.getTimestamp().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        return new RuntimePredictionDto(timestamp, ruleBasedRuntime, aiCorrectedRuntime, confidence);
    }

    /**
     * Physics-based fuel runtime calculation
     * Formula: Runtime (hours) = (Fuel Level % / 100) * Tank Capacity (L) / Fuel Consumption Rate (L/h)
     *
     * Assumptions:
     * - Average tank capacity: 200L
     * - Base consumption: 15 L/h at no load
     * - Additional consumption: 0.3 L/h per kW load
     * - RPM factor: consumption increases with RPM
     */
    private double calculateRuleBasedFuelRuntime(double fuelLevel, double loadPower, double rpm) {
        if (fuelLevel <= 0) return 0.0;

        // Tank specifications
        double tankCapacity = 200.0; // Liters (inferred from historical data)
        double availableFuel = (fuelLevel / 100.0) * tankCapacity;

        // Consumption rate calculation
        double baseConsumption = 15.0; // L/h at idle
        double loadConsumption = loadPower * 0.3; // L/h per kW

        // RPM factor (normalized to 1500 RPM)
        double rpmFactor = rpm > 0 ? (rpm / 1500.0) : 1.0;
        if (rpmFactor < 0.5) rpmFactor = 0.5; // Minimum factor
        if (rpmFactor > 2.0) rpmFactor = 2.0; // Maximum factor

        double totalConsumption = (baseConsumption + loadConsumption) * rpmFactor;

        if (totalConsumption <= 0) return 100.0; // If no consumption, return high value

        double runtime = availableFuel / totalConsumption;

        return Math.max(0, runtime); // Ensure non-negative
    }

    /**
     * Predict battery drain time using physics-based rules + AI correction
     */
    @Transactional
    public BatteryPredictionDto predictBatteryDrain(Device device, TelemetryHistory telemetry) {
        double batteryVoltage = telemetry.getBatteryVolts() != null ? telemetry.getBatteryVolts() : 0.0;
        double loadPower = (telemetry.getGeneratorPL1() != null ? telemetry.getGeneratorPL1() : 0.0) +
                          (telemetry.getGeneratorPL2() != null ? telemetry.getGeneratorPL2() : 0.0) +
                          (telemetry.getGeneratorPL3() != null ? telemetry.getGeneratorPL3() : 0.0);

        // Rule-based prediction
        double ruleBasedDrain = calculateRuleBasedBatteryDrain(batteryVoltage, loadPower);

        // AI correction
        Optional<AIModelState> modelStateOpt = modelStateRepository.findByDeviceAndType(device, BATTERY_DRAIN);
        double aiCorrectedDrain = ruleBasedDrain;
        double confidence = 0.5; // Default confidence

        if (modelStateOpt.isPresent()) {
            AIModelState model = modelStateOpt.get();

            // Apply linear regression correction
            // y = c0 + c1*batteryVoltage + c2*loadPower
            double correction = (model.getCoefficient0() != null ? model.getCoefficient0() : 0.0) +
                               (model.getCoefficient1() != null ? model.getCoefficient1() : 0.0) * batteryVoltage +
                               (model.getCoefficient2() != null ? model.getCoefficient2() : 0.0) * loadPower;

            aiCorrectedDrain = ruleBasedDrain + correction;

            // Ensure positive drain time
            if (aiCorrectedDrain < 0) aiCorrectedDrain = 0;

            // Calculate confidence
            if (model.getTrainingDataCount() != null && model.getTrainingDataCount() > 10) {
                confidence = Math.min(0.95, 0.5 + (model.getTrainingDataCount() / 100.0));
                if (model.getMeanAbsoluteError() != null && model.getMeanAbsoluteError() > 0.5) {
                    confidence *= 0.8;
                }
            }
        }

        // Save prediction
        AIPredictionHistory prediction = new AIPredictionHistory();
        prediction.setDevice(device);
        prediction.setPredictionType(BATTERY_DRAIN);
        prediction.setBatteryVoltage(batteryVoltage);
        prediction.setLoadPower(loadPower);
        prediction.setRuleBasedPrediction(ruleBasedDrain);
        prediction.setAiCorrectedPrediction(aiCorrectedDrain);
        prediction.setConfidence(confidence);
        predictionHistoryRepository.save(prediction);

        long timestamp = telemetry.getTimestamp().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        return new BatteryPredictionDto(timestamp, ruleBasedDrain, aiCorrectedDrain, confidence);
    }

    /**
     * Physics-based battery drain calculation
     * Formula: Drain Time (hours) = Battery Capacity (Ah) * Voltage Health Factor / Current Draw (A)
     *
     * Assumptions:
     * - Nominal battery capacity: 100 Ah (typical for generator starter batteries)
     * - Voltage health mapping:
     *   - 12.6V or above: 100% capacity
     *   - 12.4V: 75% capacity
     *   - 12.2V: 50% capacity
     *   - 12.0V: 25% capacity
     *   - Below 11.8V: Critical, 10% capacity
     * - Current draw from load (approximate)
     */
    private double calculateRuleBasedBatteryDrain(double batteryVoltage, double loadPower) {
        if (batteryVoltage <= 0) return 0.0;

        // Battery specifications
        double nominalCapacity = 100.0; // Ah

        // Voltage-based capacity factor (State of Charge estimation)
        double capacityFactor;
        if (batteryVoltage >= 12.6) {
            capacityFactor = 1.0;
        } else if (batteryVoltage >= 12.4) {
            capacityFactor = 0.75 + (batteryVoltage - 12.4) * 1.25; // Linear interpolation
        } else if (batteryVoltage >= 12.2) {
            capacityFactor = 0.50 + (batteryVoltage - 12.2) * 1.25;
        } else if (batteryVoltage >= 12.0) {
            capacityFactor = 0.25 + (batteryVoltage - 12.0) * 1.25;
        } else if (batteryVoltage >= 11.8) {
            capacityFactor = 0.10 + (batteryVoltage - 11.8) * 0.75;
        } else {
            capacityFactor = 0.10; // Critical
        }

        double availableCapacity = nominalCapacity * capacityFactor;

        // Estimate current draw
        // Assume 12V system, P = V * I, so I = P / V
        // Add base current for control systems (approximately 2A)
        double baseCurrent = 2.0; // A for control systems
        double loadCurrent = loadPower > 0 ? (loadPower * 1000) / batteryVoltage : 0; // Convert kW to W, then to A
        double totalCurrent = baseCurrent + (loadCurrent * 0.1); // Battery only supports 10% of load (control systems)

        if (totalCurrent <= 0) return 100.0; // If no draw, return high value

        double drainTime = availableCapacity / totalCurrent;

        return Math.max(0, drainTime); // Ensure non-negative
    }
}
