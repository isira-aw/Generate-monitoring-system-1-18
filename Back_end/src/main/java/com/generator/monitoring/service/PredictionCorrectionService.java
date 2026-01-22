package com.generator.monitoring.service;

import com.generator.monitoring.entity.PredictionCorrectionFactors;
import com.generator.monitoring.entity.RuntimePrediction;
import com.generator.monitoring.repository.PredictionCorrectionFactorsRepository;
import com.generator.monitoring.repository.RuntimePredictionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class PredictionCorrectionService {

    private static final Logger logger = LoggerFactory.getLogger(PredictionCorrectionService.class);

    // Maximum age for predictions to consider for learning (days)
    private static final int MAX_PREDICTION_AGE_DAYS = 7;

    @Autowired
    private RuntimePredictionRepository predictionRepository;

    @Autowired
    private PredictionCorrectionFactorsRepository correctionFactorsRepository;

    /**
     * Record actual generator depletion event and update AI correction
     * @param deviceId Device identifier
     * @param actualDepletionTime When generator actually ran out of fuel
     */
    @Transactional
    public void recordGeneratorDepletionEvent(String deviceId, LocalDateTime actualDepletionTime) {
        logger.info("Recording generator depletion event for device: {} at {}", deviceId, actualDepletionTime);

        // Find the most recent generator prediction before depletion
        LocalDateTime searchStartTime = actualDepletionTime.minusDays(MAX_PREDICTION_AGE_DAYS);

        List<RuntimePrediction> predictions = predictionRepository
                .findByDeviceAndTimeRange(deviceId, searchStartTime, actualDepletionTime);

        RuntimePrediction matchingPrediction = predictions.stream()
                .filter(p -> p.getPredictionType() == RuntimePrediction.PredictionType.GENERATOR)
                .filter(p -> p.getActualRuntimeHours() == null) // Not yet recorded
                .findFirst()
                .orElse(null);

        if (matchingPrediction == null) {
            logger.warn("No matching generator prediction found for device: {}", deviceId);
            return;
        }

        // Calculate actual runtime
        Duration actualDuration = Duration.between(matchingPrediction.getPredictedAt(), actualDepletionTime);
        double actualRuntimeHours = actualDuration.toMinutes() / 60.0;

        // Update prediction with actual data
        matchingPrediction.setActualRuntimeHours(actualRuntimeHours);
        matchingPrediction.setActualDepletionTime(actualDepletionTime);

        double predictionError = actualRuntimeHours - matchingPrediction.getPredictedRuntimeHours();
        double predictionErrorPercent = (predictionError / actualRuntimeHours) * 100.0;

        matchingPrediction.setPredictionError(predictionError);
        matchingPrediction.setPredictionErrorPercent(predictionErrorPercent);

        predictionRepository.save(matchingPrediction);

        logger.info("Prediction updated - Predicted: {} h, Actual: {} h, Error: {} h ({}%)",
                matchingPrediction.getPredictedRuntimeHours(), actualRuntimeHours,
                predictionError, predictionErrorPercent);

        // Update correction factors using AI learning
        updateGeneratorCorrectionFactor(deviceId, actualRuntimeHours,
                matchingPrediction.getRawPredictedRuntimeHours());
    }

    /**
     * Record actual battery depletion event and update AI correction
     * @param deviceId Device identifier
     * @param actualDepletionTime When battery actually depleted
     */
    @Transactional
    public void recordBatteryDepletionEvent(String deviceId, LocalDateTime actualDepletionTime) {
        logger.info("Recording battery depletion event for device: {} at {}", deviceId, actualDepletionTime);

        // Find the most recent battery prediction before depletion
        LocalDateTime searchStartTime = actualDepletionTime.minusDays(MAX_PREDICTION_AGE_DAYS);

        List<RuntimePrediction> predictions = predictionRepository
                .findByDeviceAndTimeRange(deviceId, searchStartTime, actualDepletionTime);

        RuntimePrediction matchingPrediction = predictions.stream()
                .filter(p -> p.getPredictionType() == RuntimePrediction.PredictionType.BATTERY)
                .filter(p -> p.getActualRuntimeHours() == null) // Not yet recorded
                .findFirst()
                .orElse(null);

        if (matchingPrediction == null) {
            logger.warn("No matching battery prediction found for device: {}", deviceId);
            return;
        }

        // Calculate actual runtime
        Duration actualDuration = Duration.between(matchingPrediction.getPredictedAt(), actualDepletionTime);
        double actualRuntimeHours = actualDuration.toMinutes() / 60.0;

        // Update prediction with actual data
        matchingPrediction.setActualRuntimeHours(actualRuntimeHours);
        matchingPrediction.setActualDepletionTime(actualDepletionTime);

        double predictionError = actualRuntimeHours - matchingPrediction.getPredictedRuntimeHours();
        double predictionErrorPercent = (predictionError / actualRuntimeHours) * 100.0;

        matchingPrediction.setPredictionError(predictionError);
        matchingPrediction.setPredictionErrorPercent(predictionErrorPercent);

        predictionRepository.save(matchingPrediction);

        logger.info("Prediction updated - Predicted: {} h, Actual: {} h, Error: {} h ({}%)",
                matchingPrediction.getPredictedRuntimeHours(), actualRuntimeHours,
                predictionError, predictionErrorPercent);

        // Update correction factors using AI learning
        updateBatteryCorrectionFactor(deviceId, actualRuntimeHours,
                matchingPrediction.getRawPredictedRuntimeHours());
    }

    /**
     * Update generator correction factor using Exponential Moving Average
     * @param deviceId Device identifier
     * @param actualRuntime Actual runtime in hours
     * @param rawPredictedRuntime Raw predicted runtime (before correction) in hours
     */
    @Transactional
    public void updateGeneratorCorrectionFactor(String deviceId, double actualRuntime, double rawPredictedRuntime) {
        PredictionCorrectionFactors factors = correctionFactorsRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Correction factors not found for device: " + deviceId));

        double oldFactor = factors.getGeneratorCorrectionFactor();

        // Update correction factor using EMA
        factors.updateGeneratorCorrection(actualRuntime, rawPredictedRuntime);

        correctionFactorsRepository.save(factors);

        logger.info("Generator correction factor updated for device {}: {} -> {} (avg error: {}%)",
                deviceId, oldFactor, factors.getGeneratorCorrectionFactor(),
                factors.getGeneratorAvgErrorPercent());
    }

    /**
     * Update battery correction factor using Exponential Moving Average
     * @param deviceId Device identifier
     * @param actualRuntime Actual runtime in hours
     * @param rawPredictedRuntime Raw predicted runtime (before correction) in hours
     */
    @Transactional
    public void updateBatteryCorrectionFactor(String deviceId, double actualRuntime, double rawPredictedRuntime) {
        PredictionCorrectionFactors factors = correctionFactorsRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Correction factors not found for device: " + deviceId));

        double oldFactor = factors.getBatteryCorrectionFactor();

        // Update correction factor using EMA
        factors.updateBatteryCorrection(actualRuntime, rawPredictedRuntime);

        correctionFactorsRepository.save(factors);

        logger.info("Battery correction factor updated for device {}: {} -> {} (avg error: {}%)",
                deviceId, oldFactor, factors.getBatteryCorrectionFactor(),
                factors.getBatteryAvgErrorPercent());
    }

    /**
     * Get prediction accuracy metrics for a device
     * @param deviceId Device identifier
     * @return Accuracy statistics
     */
    public PredictionAccuracyMetrics getAccuracyMetrics(String deviceId) {
        PredictionCorrectionFactors factors = correctionFactorsRepository.findByDeviceId(deviceId)
                .orElse(null);

        if (factors == null) {
            return new PredictionAccuracyMetrics();
        }

        List<RuntimePrediction> recentActuals = predictionRepository.findRecentActuals(deviceId);

        PredictionAccuracyMetrics metrics = new PredictionAccuracyMetrics();
        metrics.setGeneratorCorrectionFactor(factors.getGeneratorCorrectionFactor());
        metrics.setBatteryCorrectionFactor(factors.getBatteryCorrectionFactor());
        metrics.setGeneratorAvgErrorPercent(factors.getGeneratorAvgErrorPercent());
        metrics.setBatteryAvgErrorPercent(factors.getBatteryAvgErrorPercent());
        metrics.setGeneratorPredictionCount(factors.getGeneratorPredictionCount());
        metrics.setBatteryPredictionCount(factors.getBatteryPredictionCount());
        metrics.setGeneratorActualEventCount(factors.getGeneratorActualEventCount());
        metrics.setBatteryActualEventCount(factors.getBatteryActualEventCount());
        metrics.setLastUpdated(factors.getLastUpdatedAt());

        return metrics;
    }

    /**
     * Data class for prediction accuracy metrics
     */
    public static class PredictionAccuracyMetrics {
        private Double generatorCorrectionFactor = 1.0;
        private Double batteryCorrectionFactor = 1.0;
        private Double generatorAvgErrorPercent = 0.0;
        private Double batteryAvgErrorPercent = 0.0;
        private Integer generatorPredictionCount = 0;
        private Integer batteryPredictionCount = 0;
        private Integer generatorActualEventCount = 0;
        private Integer batteryActualEventCount = 0;
        private LocalDateTime lastUpdated;

        // Getters and setters
        public Double getGeneratorCorrectionFactor() { return generatorCorrectionFactor; }
        public void setGeneratorCorrectionFactor(Double generatorCorrectionFactor) {
            this.generatorCorrectionFactor = generatorCorrectionFactor;
        }

        public Double getBatteryCorrectionFactor() { return batteryCorrectionFactor; }
        public void setBatteryCorrectionFactor(Double batteryCorrectionFactor) {
            this.batteryCorrectionFactor = batteryCorrectionFactor;
        }

        public Double getGeneratorAvgErrorPercent() { return generatorAvgErrorPercent; }
        public void setGeneratorAvgErrorPercent(Double generatorAvgErrorPercent) {
            this.generatorAvgErrorPercent = generatorAvgErrorPercent;
        }

        public Double getBatteryAvgErrorPercent() { return batteryAvgErrorPercent; }
        public void setBatteryAvgErrorPercent(Double batteryAvgErrorPercent) {
            this.batteryAvgErrorPercent = batteryAvgErrorPercent;
        }

        public Integer getGeneratorPredictionCount() { return generatorPredictionCount; }
        public void setGeneratorPredictionCount(Integer generatorPredictionCount) {
            this.generatorPredictionCount = generatorPredictionCount;
        }

        public Integer getBatteryPredictionCount() { return batteryPredictionCount; }
        public void setBatteryPredictionCount(Integer batteryPredictionCount) {
            this.batteryPredictionCount = batteryPredictionCount;
        }

        public Integer getGeneratorActualEventCount() { return generatorActualEventCount; }
        public void setGeneratorActualEventCount(Integer generatorActualEventCount) {
            this.generatorActualEventCount = generatorActualEventCount;
        }

        public Integer getBatteryActualEventCount() { return batteryActualEventCount; }
        public void setBatteryActualEventCount(Integer batteryActualEventCount) {
            this.batteryActualEventCount = batteryActualEventCount;
        }

        public LocalDateTime getLastUpdated() { return lastUpdated; }
        public void setLastUpdated(LocalDateTime lastUpdated) {
            this.lastUpdated = lastUpdated;
        }
    }
}
