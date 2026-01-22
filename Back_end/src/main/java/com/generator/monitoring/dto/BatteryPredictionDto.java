package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatteryPredictionDto {
    private Long timestamp;
    private Double ruleBasedDrain;
    private Double aiCorrectedDrain;
    private Double confidence;
}
