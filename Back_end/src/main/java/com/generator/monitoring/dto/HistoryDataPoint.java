package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoryDataPoint {
    private LocalDateTime timestamp;
    private Map<String, Object> parameters; // Dynamic map of parameter name to value
}
