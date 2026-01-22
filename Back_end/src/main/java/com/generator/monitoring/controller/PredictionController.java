package com.generator.monitoring.controller;

import com.generator.monitoring.entity.RuntimePrediction;
import com.generator.monitoring.service.PredictionCorrectionService;
import com.generator.monitoring.service.RuntimePredictionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/predictions")
@CrossOrigin(origins = "*")
public class PredictionController {

    private static final Logger logger = LoggerFactory.getLogger(PredictionController.class);

    @Autowired
    private RuntimePredictionService predictionService;

    @Autowired
    private PredictionCorrectionService correctionService;

    /**
     * Get current runtime predictions for a device (both generator and battery)
     * Public endpoint - no authentication required
     */
    @GetMapping("/{deviceId}/runtime")
    public ResponseEntity<Map<String, Object>> getRuntimePredictions(@PathVariable String deviceId) {
        try {
            logger.info("Getting runtime predictions for device: {}", deviceId);

            Map<String, Object> response = new HashMap<>();

            // Get generator prediction
            try {
                RuntimePrediction generatorPrediction = predictionService.predictGeneratorRuntime(deviceId);
                if (generatorPrediction != null) {
                    response.put("generator", convertToResponse(generatorPrediction));
                } else {
                    response.put("generator", null);
                    response.put("generatorMessage", "Insufficient data or device specs not configured");
                }
            } catch (Exception e) {
                logger.error("Error predicting generator runtime: {}", e.getMessage());
                response.put("generator", null);
                response.put("generatorError", e.getMessage());
            }

            // Get battery prediction
            try {
                RuntimePrediction batteryPrediction = predictionService.predictBatteryRuntime(deviceId);
                if (batteryPrediction != null) {
                    response.put("battery", convertToResponse(batteryPrediction));
                } else {
                    response.put("battery", null);
                    response.put("batteryMessage", "Battery charging or insufficient data");
                }
            } catch (Exception e) {
                logger.error("Error predicting battery runtime: {}", e.getMessage());
                response.put("battery", null);
                response.put("batteryError", e.getMessage());
            }

            // Get accuracy metrics
            try {
                PredictionCorrectionService.PredictionAccuracyMetrics metrics =
                        correctionService.getAccuracyMetrics(deviceId);
                response.put("accuracyMetrics", metrics);
            } catch (Exception e) {
                logger.warn("Could not get accuracy metrics: {}", e.getMessage());
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error getting predictions for device {}: {}", deviceId, e.getMessage(), e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Record generator depletion event (when fuel runs out)
     * This endpoint is called manually or automatically when fuel level reaches 0
     */
    @PostMapping("/{deviceId}/event/generator-depleted")
    public ResponseEntity<Map<String, String>> recordGeneratorDepletion(
            @PathVariable String deviceId,
            @RequestBody(required = false) Map<String, String> requestBody) {

        try {
            LocalDateTime depletionTime = LocalDateTime.now();

            // Allow custom timestamp if provided
            if (requestBody != null && requestBody.containsKey("depletionTime")) {
                depletionTime = LocalDateTime.parse(requestBody.get("depletionTime"));
            }

            logger.info("Recording generator depletion for device: {} at {}", deviceId, depletionTime);

            correctionService.recordGeneratorDepletionEvent(deviceId, depletionTime);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Generator depletion event recorded successfully");
            response.put("deviceId", deviceId);
            response.put("depletionTime", depletionTime.toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error recording generator depletion for device {}: {}", deviceId, e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Record battery depletion event (when battery runs out)
     * This endpoint is called manually or automatically when battery voltage reaches minimum
     */
    @PostMapping("/{deviceId}/event/battery-depleted")
    public ResponseEntity<Map<String, String>> recordBatteryDepletion(
            @PathVariable String deviceId,
            @RequestBody(required = false) Map<String, String> requestBody) {

        try {
            LocalDateTime depletionTime = LocalDateTime.now();

            // Allow custom timestamp if provided
            if (requestBody != null && requestBody.containsKey("depletionTime")) {
                depletionTime = LocalDateTime.parse(requestBody.get("depletionTime"));
            }

            logger.info("Recording battery depletion for device: {} at {}", deviceId, depletionTime);

            correctionService.recordBatteryDepletionEvent(deviceId, depletionTime);

            Map<String, String> response = new HashMap<>();
            response.put("message", "Battery depletion event recorded successfully");
            response.put("deviceId", deviceId);
            response.put("depletionTime", depletionTime.toString());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error recording battery depletion for device {}: {}", deviceId, e.getMessage(), e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Convert RuntimePrediction entity to API response format
     */
    private Map<String, Object> convertToResponse(RuntimePrediction prediction) {
        Map<String, Object> response = new HashMap<>();

        response.put("id", prediction.getId());
        response.put("predictedAt", prediction.getPredictedAt());
        response.put("predictedRuntimeHours", prediction.getPredictedRuntimeHours());
        response.put("predictedDepletionTime", prediction.getPredictedDepletionTime());
        response.put("confidenceScore", prediction.getConfidenceScore());
        response.put("rawRuntimeHours", prediction.getRawPredictedRuntimeHours());
        response.put("correctionFactor", prediction.getCorrectionFactor());

        // Type-specific data
        if (prediction.getPredictionType() == RuntimePrediction.PredictionType.GENERATOR) {
            response.put("type", "generator");
            response.put("fuelLevelPercent", prediction.getFuelLevelPercent());
            response.put("fuelBurnRateLh", prediction.getFuelBurnRateLitersPerHour());
        } else {
            response.put("type", "battery");
            response.put("batteryVoltage", prediction.getBatteryVoltage());
            response.put("batteryDrainRateVh", prediction.getBatteryDrainRateVoltsPerHour());
        }

        response.put("avgLoadKw", prediction.getAvgLoadKw());

        // Actual data (if available)
        if (prediction.getActualRuntimeHours() != null) {
            response.put("actualRuntimeHours", prediction.getActualRuntimeHours());
            response.put("actualDepletionTime", prediction.getActualDepletionTime());
            response.put("predictionError", prediction.getPredictionError());
            response.put("predictionErrorPercent", prediction.getPredictionErrorPercent());
        }

        return response;
    }
}
