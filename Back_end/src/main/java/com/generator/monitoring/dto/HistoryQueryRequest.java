package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoryQueryRequest {
    private String deviceId;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private List<String> parameters; // List of parameter names to include in response
}
