package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RuntimePredictionDto {
    private Long timestamp;
    private Double ruleBasedRuntime;
    private Double aiCorrectedRuntime;
    private Double confidence;
}
