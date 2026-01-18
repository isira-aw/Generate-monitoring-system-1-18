package com.generator.monitoring.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TelemetryData {
    private String deviceId;
    private LocalDateTime timestamp;
    private Double voltage;
    private Double current;
    private Double frequency;
    private Double power;
    private Double temperature;
    private Double fuelLevel;
    private Double oilPressure;
    private Double rpm;

    @JsonProperty("device_alarms")
    private List<String> deviceAlarms; // Alarms from the device itself
}
