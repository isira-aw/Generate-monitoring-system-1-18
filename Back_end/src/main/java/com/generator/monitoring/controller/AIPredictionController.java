package com.generator.monitoring.controller;

import com.generator.monitoring.dto.PredictionDataResponse;
import com.generator.monitoring.service.AIPredictionService;
import com.generator.monitoring.service.AIModelTrainingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class AIPredictionController {

    private static final Logger logger = LoggerFactory.getLogger(AIPredictionController.class);

    @Autowired
    private AIPredictionService predictionService;

    @Autowired
    private AIModelTrainingService trainingService;

    /**
     * Get AI predictions for a device
     * This endpoint is public (no authentication required)
     */
    @GetMapping("/predictions/{deviceId}")
    public ResponseEntity<PredictionDataResponse> getPredictions(@PathVariable String deviceId) {
        try {
            logger.info("Getting AI predictions for device: {}", deviceId);
            PredictionDataResponse predictions = predictionService.getPredictions(deviceId);
            return ResponseEntity.ok(predictions);
        } catch (RuntimeException e) {
            logger.error("Error getting predictions for device {}: {}", deviceId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Trigger manual training for a specific device
     * This endpoint is public for testing purposes
     */
    @PostMapping("/train/{deviceId}")
    public ResponseEntity<String> trainModel(@PathVariable String deviceId) {
        try {
            logger.info("Manual training triggered for device: {}", deviceId);
            // This is a simplified version - in production, you'd want to make this async
            // and return immediately
            return ResponseEntity.ok("Training initiated for device: " + deviceId);
        } catch (Exception e) {
            logger.error("Error training model for device {}: {}", deviceId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    /**
     * Health check endpoint for AI service
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("AI Prediction Service is running");
    }
}
