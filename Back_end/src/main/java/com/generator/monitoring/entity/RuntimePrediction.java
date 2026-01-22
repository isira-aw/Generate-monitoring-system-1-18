package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "runtime_predictions", indexes = {
        @Index(name = "idx_device_timestamp", columnList = "device_id,predicted_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class RuntimePrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String deviceId;

    @Column(nullable = false)
    private LocalDateTime predictedAt;

    // Prediction Type
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private PredictionType predictionType; // GENERATOR or BATTERY

    // Input Data (snapshot at prediction time)
    @Column
    private Double fuelLevelPercent;

    @Column
    private Double batteryVoltage;

    @Column
    private Double currentLoadKw;

    @Column
    private Double avgLoadKw; // Average load over analysis window

    // Predicted Values
    @Column(nullable = false)
    private Double predictedRuntimeHours;

    @Column
    private LocalDateTime predictedDepletionTime;

    @Column(nullable = false)
    private Double confidenceScore; // 0.0 to 1.0

    // Physics Calculation (before AI correction)
    @Column
    private Double rawPredictedRuntimeHours;

    @Column
    private Double fuelBurnRateLitersPerHour;

    @Column
    private Double batteryDrainRateVoltsPerHour;

    // AI Correction Applied
    @Column
    private Double correctionFactor; // e.g., 1.05 means AI adjusted +5%

    // Actual Result (filled when event occurs)
    @Column
    private Double actualRuntimeHours;

    @Column
    private LocalDateTime actualDepletionTime;

    @Column
    private Double predictionError; // actual - predicted (in hours)

    @Column
    private Double predictionErrorPercent; // (actual - predicted) / actual * 100

    @PrePersist
    protected void onCreate() {
        if (predictedAt == null) {
            predictedAt = LocalDateTime.now();
        }
        if (predictedDepletionTime == null && predictedRuntimeHours != null) {
            predictedDepletionTime = predictedAt.plusHours(predictedRuntimeHours.longValue())
                    .plusMinutes((long) ((predictedRuntimeHours % 1) * 60));
        }
    }

    public enum PredictionType {
        GENERATOR,
        BATTERY
    }
}
