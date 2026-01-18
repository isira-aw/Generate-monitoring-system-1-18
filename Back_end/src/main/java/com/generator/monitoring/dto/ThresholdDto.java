package com.generator.monitoring.dto;

import com.generator.monitoring.enums.ThresholdParameter;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ThresholdDto {
    private Long id;
    private ThresholdParameter parameter;
    private Double minValue;
    private Double maxValue;
    private String unit;
}
