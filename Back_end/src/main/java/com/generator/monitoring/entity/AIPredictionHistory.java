package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_prediction_history", indexes = {
    @Index(name = "idx_device_timestamp", columnList = "device_id,timestamp"),
    @Index(name = "idx_prediction_type", columnList = "prediction_type,timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIPredictionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false, length = 50)
    private String predictionType; // FUEL_RUNTIME or BATTERY_DRAIN

    // Input features
    @Column
    private Double fuelLevel;

    @Column
    private Double batteryVoltage;

    @Column
    private Double loadPower;

    @Column
    private Double rpm;

    @Column
    private Double generatorFrequency;

    // Prediction outputs
    @Column
    private Double ruleBasedPrediction;

    @Column
    private Double aiCorrectedPrediction;

    @Column
    private Double confidence;

    // Actual value (populated later for training)
    @Column
    private Double actualValue;

    @Column
    private LocalDateTime actualValueTimestamp;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
