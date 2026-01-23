package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "battery_prediction_history", indexes = {
    @Index(name = "idx_battery_device_timestamp", columnList = "device_id,timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatteryPredictionHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @Column(nullable = false)
    private Double batterySoc;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
