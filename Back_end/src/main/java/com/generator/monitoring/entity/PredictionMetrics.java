package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "prediction_metrics", indexes = {
    @Index(name = "idx_prediction_device", columnList = "device_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionMetrics {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false, unique = true)
    private Device device;

    private Double fuelDeclineRate;
    private Double batteryDeclineRate;
    private Double fuelPredictedRuntimeHours;
    private Double batteryPredictedRuntimeHours;

    @Column(nullable = false)
    private LocalDateTime lastUpdated;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        lastUpdated = LocalDateTime.now();
    }
}
