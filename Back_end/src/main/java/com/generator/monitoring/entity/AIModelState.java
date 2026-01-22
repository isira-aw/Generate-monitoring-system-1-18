package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "ai_model_state", indexes = {
    @Index(name = "idx_model_device_type", columnList = "device_id,model_type")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIModelState {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false, length = 50)
    private String modelType; // FUEL_RUNTIME or BATTERY_DRAIN

    // Linear regression coefficients (simple model)
    @Column
    private Double coefficient0; // Intercept

    @Column
    private Double coefficient1; // Feature 1 coefficient

    @Column
    private Double coefficient2; // Feature 2 coefficient

    @Column
    private Double coefficient3; // Feature 3 coefficient

    // Model metadata
    @Column
    private Integer trainingDataCount;

    @Column
    private Double meanAbsoluteError;

    @Column
    private Double rSquared;

    @Column(nullable = false)
    private LocalDateTime lastTrainedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        lastTrainedAt = LocalDateTime.now();
    }
}
