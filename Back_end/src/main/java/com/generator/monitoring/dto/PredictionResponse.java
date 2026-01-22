package com.generator.monitoring.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {

    @JsonProperty("fuelPrediction")
    private FuelPredictionData fuelPrediction;

    @JsonProperty("batteryPrediction")
    private BatteryPredictionData batteryPrediction;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FuelPredictionData {
        @JsonProperty("currentLevel")
        private Double currentLevel;

        @JsonProperty("declineRate")
        private Double declineRate;

        @JsonProperty("predictedRuntimeHours")
        private Double predictedRuntimeHours;

        @JsonProperty("predictedRuntimeMinutes")
        private Double predictedRuntimeMinutes;

        @JsonProperty("estimatedEmptyTime")
        private LocalDateTime estimatedEmptyTime;

        @JsonProperty("historicalData")
        private List<HistoricalDataPoint> historicalData;

        @JsonProperty("hasEnoughData")
        private Boolean hasEnoughData;

        @JsonProperty("message")
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BatteryPredictionData {
        @JsonProperty("currentSoc")
        private Double currentSoc;

        @JsonProperty("declineRate")
        private Double declineRate;

        @JsonProperty("predictedRuntimeHours")
        private Double predictedRuntimeHours;

        @JsonProperty("predictedRuntimeMinutes")
        private Double predictedRuntimeMinutes;

        @JsonProperty("estimatedEmptyTime")
        private LocalDateTime estimatedEmptyTime;

        @JsonProperty("historicalData")
        private List<HistoricalDataPoint> historicalData;

        @JsonProperty("hasEnoughData")
        private Boolean hasEnoughData;

        @JsonProperty("message")
        private String message;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HistoricalDataPoint {
        @JsonProperty("timestamp")
        private LocalDateTime timestamp;

        @JsonProperty("value")
        private Double value;
    }
}
