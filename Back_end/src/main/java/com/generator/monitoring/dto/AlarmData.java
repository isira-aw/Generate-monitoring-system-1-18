package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AlarmData {
    private String deviceId;
    private String parameter;
    private String message;
    private String severity; // WARNING, CRITICAL
    private Double value;
    private LocalDateTime timestamp;
}
