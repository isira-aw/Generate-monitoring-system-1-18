package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PredictionDataResponse {
    private List<RuntimePredictionDto> fuelPredictions;
    private List<BatteryPredictionDto> batteryPredictions;
    private Double currentFuelLevel;
    private Double currentBatteryVoltage;
    private Double currentLoad;
    private String lastUpdated;
}
