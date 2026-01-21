package com.generator.monitoring.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "telemetry_history", indexes = {
    @Index(name = "idx_device_timestamp", columnList = "device_id,timestamp"),
    @Index(name = "idx_timestamp", columnList = "timestamp")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "device_id", nullable = false)
    private Device device;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    // RPM
    private Double rpm;

    // Generator Power (Real Power)
    private Double generatorPL1;
    private Double generatorPL2;
    private Double generatorPL3;

    // Generator Reactive Power
    private Double generatorQ;
    private Double generatorQL1;
    private Double generatorQL2;
    private Double generatorQL3;

    // Generator Apparent Power
    private Double generatorS;
    private Double generatorSL1;
    private Double generatorSL2;
    private Double generatorSL3;

    // Generator Power Factor
    private Double generatorPowerFactor;

    // Generator Frequency
    private Double generatorFrequency;

    // Generator Voltage (Line to Neutral)
    private Double generatorVoltageL1N;
    private Double generatorVoltageL2N;
    private Double generatorVoltageL3N;

    // Generator Voltage (Line to Line)
    private Double generatorVoltageL1L2;
    private Double generatorVoltageL2L3;
    private Double generatorVoltageL3L1;

    // Generator Current
    private Double generatorCurrentL1;
    private Double generatorCurrentL2;
    private Double generatorCurrentL3;

    // Earth Fault Current
    private Double earthFaultCurrent;

    // Mains/Bus Frequency
    private Double mainsBusFrequency;

    // Mains/Bus Voltage (Line to Neutral)
    private Double mainsBusVoltageL1N;
    private Double mainsBusVoltageL2N;
    private Double mainsBusVoltageL3N;

    // Mains/Bus Voltage (Line to Line)
    private Double mainsBusVoltageL1L2;
    private Double mainsBusVoltageL2L3;
    private Double mainsBusVoltageL3L1;

    // Mains Current
    private Double mainsL1Current;

    // Mains Import
    private Double mainsImportP;
    private Double mainsImportQ;

    // Mains Power Factor
    private Double mainsPF;

    // Vector Shift and ROCOF
    private Double maxVectorShift;
    private Double rocof;
    private Double maxRocof;

    // Load
    private Double loadP;
    private Double loadQ;
    private Double loadPF;

    // Battery and D+
    private Double batteryVolts;
    private Double dPlus;

    // Oil
    private Double oilPressure;
    private Double oilTemperature;

    // Fuel Level
    private Double fuelLevel;

    // E-STOP (Binary)
    private Boolean eStop;

    // Alarm string from device
    @Column(length = 1000)
    private String alarm;

    @PrePersist
    protected void onCreate() {
        if (timestamp == null) {
            timestamp = LocalDateTime.now();
        }
    }
}
