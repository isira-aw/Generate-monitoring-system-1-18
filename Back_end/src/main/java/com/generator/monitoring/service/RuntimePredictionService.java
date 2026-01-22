package com.generator.monitoring.service;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.PredictionCorrectionFactors;
import com.generator.monitoring.entity.RuntimePrediction;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.PredictionCorrectionFactorsRepository;
import com.generator.monitoring.repository.RuntimePredictionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class RuntimePredictionService {

    private static final Logger logger = LoggerFactory.getLogger(RuntimePredictionService.class);

    // Default fuel burn rate if calculation fails (L/h) - conservative estimate
    private static final double DEFAULT_FUEL_BURN_RATE_LH = 5.0;

    // Default battery drain rate if calculation fails (V/h) - conservative estimate
    private static final double DEFAULT_BATTERY_DRAIN_RATE_VH = 0.5;

    // Confidence calculation based on time horizon
    private static final double CONFIDENCE_VERY_SHORT_TERM = 0.95; // < 1 hour
    private static final double CONFIDENCE_SHORT_TERM = 0.85;      // 1-4 hours
    private static final double CONFIDENCE_MEDIUM_TERM = 0.70;     // 4-8 hours
    private static final double CONFIDENCE_LONG_TERM = 0.50;       // > 8 hours

    @Autowired
    private FuelAnalysisService fuelAnalysisService;

    @Autowired
    private BatteryAnalysisService batteryAnalysisService;

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private RuntimePredictionRepository predictionRepository;

    @Autowired
    private PredictionCorrectionFactorsRepository correctionFactorsRepository;

    /**
     * Predict generator runtime based on current fuel level
     * @param deviceId Device identifier
     * @return RuntimePrediction entity with prediction details
     */
    @Transactional
    public RuntimePrediction predictGeneratorRuntime(String deviceId) {
        logger.info("Predicting generator runtime for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Get current fuel level
        Double currentFuelPercent = fuelAnalysisService.getCurrentFuelLevel(deviceId);
        if (currentFuelPercent == null || currentFuelPercent <= 0) {
            logger.warn("No fuel level data available for device: {}", deviceId);
            return null;
        }

        // Check device specifications
        if (device.getFuelTankCapacityLiters() == null || device.getFuelTankCapacityLiters() <= 0) {
            logger.warn("Device {} has no fuel tank capacity configured", deviceId);
            return null;
        }

        // Calculate fuel remaining in liters
        double fuelRemainingLiters = (currentFuelPercent / 100.0) * device.getFuelTankCapacityLiters();

        // Calculate fuel burn rate
        Double fuelBurnRateLh = fuelAnalysisService.calculateFuelBurnRate(deviceId, 2);
        if (fuelBurnRateLh == null || fuelBurnRateLh <= 0) {
            logger.warn("Could not calculate fuel burn rate, using default: {} L/h", DEFAULT_FUEL_BURN_RATE_LH);
            fuelBurnRateLh = DEFAULT_FUEL_BURN_RATE_LH;
        }

        // Calculate average load
        Double avgLoadKw = fuelAnalysisService.calculateAverageLoad(deviceId, 2);

        // Physics-based prediction: raw runtime = fuel remaining / burn rate
        double rawRuntimeHours = fuelRemainingLiters / fuelBurnRateLh;

        // Get correction factor
        PredictionCorrectionFactors correctionFactors = getCorrectionFactors(deviceId);
        double correctionFactor = correctionFactors.getGeneratorCorrectionFactor();

        // Apply AI correction
        double predictedRuntimeHours = rawRuntimeHours * correctionFactor;

        // Calculate confidence based on time horizon
        double confidence = calculateConfidence(predictedRuntimeHours);

        // Create prediction entity
        RuntimePrediction prediction = new RuntimePrediction();
        prediction.setDeviceId(deviceId);
        prediction.setPredictionType(RuntimePrediction.PredictionType.GENERATOR);
        prediction.setFuelLevelPercent(currentFuelPercent);
        prediction.setAvgLoadKw(avgLoadKw);
        prediction.setRawPredictedRuntimeHours(rawRuntimeHours);
        prediction.setFuelBurnRateLitersPerHour(fuelBurnRateLh);
        prediction.setCorrectionFactor(correctionFactor);
        prediction.setPredictedRuntimeHours(predictedRuntimeHours);
        prediction.setConfidenceScore(confidence);
        prediction.setPredictedAt(LocalDateTime.now());

        // Calculate predicted depletion time
        long hoursToAdd = (long) predictedRuntimeHours;
        long minutesToAdd = (long) ((predictedRuntimeHours % 1) * 60);
        prediction.setPredictedDepletionTime(LocalDateTime.now().plusHours(hoursToAdd).plusMinutes(minutesToAdd));

        // Save prediction
        prediction = predictionRepository.save(prediction);

        // Update prediction count
        correctionFactors.setGeneratorPredictionCount(correctionFactors.getGeneratorPredictionCount() + 1);
        correctionFactorsRepository.save(correctionFactors);

        logger.info("Generator runtime predicted: {} hours (raw: {} h, correction: {}x, confidence: {})",
                predictedRuntimeHours, rawRuntimeHours, correctionFactor, confidence);

        return prediction;
    }

    /**
     * Predict battery runtime based on current voltage/SOC
     * @param deviceId Device identifier
     * @return RuntimePrediction entity with prediction details
     */
    @Transactional
    public RuntimePrediction predictBatteryRuntime(String deviceId) {
        logger.info("Predicting battery runtime for device: {}", deviceId);

        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Get current battery voltage
        Double currentBatteryVoltage = batteryAnalysisService.getCurrentBatteryVoltage(deviceId);
        if (currentBatteryVoltage == null || currentBatteryVoltage <= 0) {
            logger.warn("No battery voltage data available for device: {}", deviceId);
            return null;
        }

        // Check if battery is charging
        if (batteryAnalysisService.isCharging(deviceId)) {
            logger.info("Battery is charging, cannot predict runtime");
            return null;
        }

        // Get nominal voltage (auto-detect if not configured)
        Double nominalVoltage = device.getBatteryVoltageNominal();
        if (nominalVoltage == null) {
            nominalVoltage = (currentBatteryVoltage > 20.0) ? 24.0 : 12.0;
        }

        // Calculate SOC
        Double soc = batteryAnalysisService.estimateSOC(currentBatteryVoltage, nominalVoltage);
        if (soc == null || soc <= 0) {
            logger.warn("Could not estimate battery SOC");
            return null;
        }

        // Calculate battery drain rate
        Double drainRateVh = batteryAnalysisService.calculateBatteryDrainRate(deviceId, 2);
        if (drainRateVh == null || drainRateVh <= 0) {
            logger.warn("Could not calculate battery drain rate, using default: {} V/h", DEFAULT_BATTERY_DRAIN_RATE_VH);
            drainRateVh = DEFAULT_BATTERY_DRAIN_RATE_VH;
        }

        // Determine minimum voltage (battery depletion threshold)
        double minVoltage = (nominalVoltage >= 20.0) ? 21.0 : 10.5;

        // Physics-based prediction: raw runtime = (current voltage - min voltage) / drain rate
        double voltageRemaining = currentBatteryVoltage - minVoltage;
        if (voltageRemaining <= 0) {
            logger.warn("Battery voltage already at minimum");
            return null;
        }

        double rawRuntimeHours = voltageRemaining / drainRateVh;

        // Get correction factor
        PredictionCorrectionFactors correctionFactors = getCorrectionFactors(deviceId);
        double correctionFactor = correctionFactors.getBatteryCorrectionFactor();

        // Apply AI correction
        double predictedRuntimeHours = rawRuntimeHours * correctionFactor;

        // Calculate confidence based on time horizon
        double confidence = calculateConfidence(predictedRuntimeHours);

        // Calculate average load
        Double avgLoadKw = fuelAnalysisService.calculateAverageLoad(deviceId, 2);

        // Create prediction entity
        RuntimePrediction prediction = new RuntimePrediction();
        prediction.setDeviceId(deviceId);
        prediction.setPredictionType(RuntimePrediction.PredictionType.BATTERY);
        prediction.setBatteryVoltage(currentBatteryVoltage);
        prediction.setAvgLoadKw(avgLoadKw);
        prediction.setRawPredictedRuntimeHours(rawRuntimeHours);
        prediction.setBatteryDrainRateVoltsPerHour(drainRateVh);
        prediction.setCorrectionFactor(correctionFactor);
        prediction.setPredictedRuntimeHours(predictedRuntimeHours);
        prediction.setConfidenceScore(confidence);
        prediction.setPredictedAt(LocalDateTime.now());

        // Calculate predicted depletion time
        long hoursToAdd = (long) predictedRuntimeHours;
        long minutesToAdd = (long) ((predictedRuntimeHours % 1) * 60);
        prediction.setPredictedDepletionTime(LocalDateTime.now().plusHours(hoursToAdd).plusMinutes(minutesToAdd));

        // Save prediction
        prediction = predictionRepository.save(prediction);

        // Update prediction count
        correctionFactors.setBatteryPredictionCount(correctionFactors.getBatteryPredictionCount() + 1);
        correctionFactorsRepository.save(correctionFactors);

        logger.info("Battery runtime predicted: {} hours (raw: {} h, correction: {}x, confidence: {}, SOC: {}%)",
                predictedRuntimeHours, rawRuntimeHours, correctionFactor, confidence, soc);

        return prediction;
    }

    /**
     * Calculate confidence score based on time horizon
     * Shorter predictions have higher confidence
     */
    private double calculateConfidence(double predictedRuntimeHours) {
        if (predictedRuntimeHours < 1.0) {
            return CONFIDENCE_VERY_SHORT_TERM; // 95% confidence for < 1 hour
        } else if (predictedRuntimeHours < 4.0) {
            return CONFIDENCE_SHORT_TERM; // 85% confidence for 1-4 hours
        } else if (predictedRuntimeHours < 8.0) {
            return CONFIDENCE_MEDIUM_TERM; // 70% confidence for 4-8 hours
        } else {
            return CONFIDENCE_LONG_TERM; // 50% confidence for > 8 hours
        }
    }

    /**
     * Get or create correction factors for device
     */
    private PredictionCorrectionFactors getCorrectionFactors(String deviceId) {
        return correctionFactorsRepository.findByDeviceId(deviceId)
                .orElseGet(() -> {
                    logger.info("Creating new correction factors for device: {}", deviceId);
                    PredictionCorrectionFactors newFactors = new PredictionCorrectionFactors();
                    newFactors.setDeviceId(deviceId);
                    newFactors.setGeneratorCorrectionFactor(1.0);
                    newFactors.setBatteryCorrectionFactor(1.0);
                    newFactors.setLearningRate(0.3);
                    return correctionFactorsRepository.save(newFactors);
                });
    }
}
