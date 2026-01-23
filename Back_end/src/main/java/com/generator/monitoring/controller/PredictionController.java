package com.generator.monitoring.controller;

import com.generator.monitoring.dto.PredictionResponse;
import com.generator.monitoring.service.PredictionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/predictions")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${cors.allowed.origins:http://localhost:3000}")
public class PredictionController {

    private final PredictionService predictionService;

    /**
     * Get prediction data for a device
     * GET /api/predictions/{deviceId}
     */
    @GetMapping("/{deviceId}")
    public ResponseEntity<PredictionResponse> getPredictions(@PathVariable String deviceId) {
        log.info("Getting predictions for device: {}", deviceId);
        try {
            PredictionResponse response = predictionService.getPredictionData(deviceId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting predictions for device: {}", deviceId, e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Manually trigger data collection for a device
     * POST /api/predictions/{deviceId}/collect
     */
    @PostMapping("/{deviceId}/collect")
    public ResponseEntity<String> collectData(@PathVariable String deviceId) {
        log.info("Manually collecting prediction data for device: {}", deviceId);
        try {
            predictionService.collectPredictionData(deviceId);
            return ResponseEntity.ok("Data collection triggered successfully");
        } catch (Exception e) {
            log.error("Error collecting data for device: {}", deviceId, e);
            return ResponseEntity.internalServerError().body("Error collecting data: " + e.getMessage());
        }
    }
}
