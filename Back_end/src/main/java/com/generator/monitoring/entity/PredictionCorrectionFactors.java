package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "prediction_correction_factors")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionCorrectionFactors {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String deviceId;

    // Generator Fuel Correction
    @Column(nullable = false)
    private Double generatorCorrectionFactor = 1.0; // Start at 1.0 (no correction)

    @Column
    private Integer generatorPredictionCount = 0; // Number of predictions made

    @Column
    private Integer generatorActualEventCount = 0; // Number of actual events recorded

    @Column
    private Double generatorAvgErrorPercent = 0.0; // Average error %

    // Battery Correction
    @Column(nullable = false)
    private Double batteryCorrectionFactor = 1.0;

    @Column
    private Integer batteryPredictionCount = 0;

    @Column
    private Integer batteryActualEventCount = 0;

    @Column
    private Double batteryAvgErrorPercent = 0.0;

    // Learning Parameters
    @Column(nullable = false)
    private Double learningRate = 0.3; // EMA alpha (30% weight to new observations)

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime lastUpdatedAt;

    @Column
    private LocalDateTime lastGeneratorEventAt;

    @Column
    private LocalDateTime lastBatteryEventAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        lastUpdatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        lastUpdatedAt = LocalDateTime.now();
    }

    /**
     * Update generator correction factor using Exponential Moving Average
     * @param actualRuntime Actual runtime in hours
     * @param predictedRuntime Predicted runtime in hours
     */
    public void updateGeneratorCorrection(double actualRuntime, double predictedRuntime) {
        double errorRatio = actualRuntime / predictedRuntime;

        // EMA: new_factor = alpha * observed_ratio + (1 - alpha) * old_factor
        this.generatorCorrectionFactor = learningRate * errorRatio +
                                         (1 - learningRate) * this.generatorCorrectionFactor;

        double errorPercent = ((actualRuntime - predictedRuntime) / actualRuntime) * 100;

        // Update running average of error
        if (generatorActualEventCount == 0) {
            this.generatorAvgErrorPercent = Math.abs(errorPercent);
        } else {
            this.generatorAvgErrorPercent = (generatorAvgErrorPercent * generatorActualEventCount + Math.abs(errorPercent))
                                            / (generatorActualEventCount + 1);
        }

        this.generatorActualEventCount++;
        this.lastGeneratorEventAt = LocalDateTime.now();
    }

    /**
     * Update battery correction factor using Exponential Moving Average
     * @param actualRuntime Actual runtime in hours
     * @param predictedRuntime Predicted runtime in hours
     */
    public void updateBatteryCorrection(double actualRuntime, double predictedRuntime) {
        double errorRatio = actualRuntime / predictedRuntime;

        this.batteryCorrectionFactor = learningRate * errorRatio +
                                       (1 - learningRate) * this.batteryCorrectionFactor;

        double errorPercent = ((actualRuntime - predictedRuntime) / actualRuntime) * 100;

        if (batteryActualEventCount == 0) {
            this.batteryAvgErrorPercent = Math.abs(errorPercent);
        } else {
            this.batteryAvgErrorPercent = (batteryAvgErrorPercent * batteryActualEventCount + Math.abs(errorPercent))
                                          / (batteryActualEventCount + 1);
        }

        this.batteryActualEventCount++;
        this.lastBatteryEventAt = LocalDateTime.now();
    }
}
