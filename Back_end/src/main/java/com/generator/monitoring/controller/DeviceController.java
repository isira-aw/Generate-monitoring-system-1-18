package com.generator.monitoring.controller;

import com.generator.monitoring.dto.*;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.enums.ThresholdParameter;
import com.generator.monitoring.service.DeviceService;
import com.generator.monitoring.service.ThresholdService;
import com.generator.monitoring.service.VerificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/devices")
public class DeviceController {

    @Autowired
    private DeviceService deviceService;

    @Autowired
    private ThresholdService thresholdService;

    @Autowired
    private VerificationService verificationService;

    @GetMapping
    public ResponseEntity<List<DeviceDto>> getAllDevices(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        return ResponseEntity.ok(deviceService.getUserDevices(userEmail));
    }

    @PostMapping("/attach")
    public ResponseEntity<DeviceDto> attachDevice(
            @RequestBody AddDeviceRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String userEmail = authentication.getName();
            DeviceDto device = deviceService.attachDeviceToUser(
                    request.getDeviceId(),
                    request.getDevicePassword(),
                    userEmail
            );
            return ResponseEntity.ok(device);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @PostMapping("/register")
    public ResponseEntity<DeviceDto> registerDevice(
            @RequestBody RegisterDeviceRequest request) {

        try {
            DeviceDto device = deviceService.registerDevice(
                    request.getDeviceId(),
                    request.getDevicePassword(),
                    request.getName(),
                    request.getLocation()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(device);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
        }
    }

    @GetMapping("/{deviceId}/dashboard")
    public ResponseEntity<DeviceDto> getDeviceDashboard(@PathVariable String deviceId) {
        // Public endpoint - no authentication required
        try {
            DeviceDto device = deviceService.getDeviceByDeviceId(deviceId);
            return ResponseEntity.ok(device);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @GetMapping("/{deviceId}/thresholds")
    public ResponseEntity<List<ThresholdDto>> getDeviceThresholds(
            @PathVariable String deviceId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            Device device = deviceService.getDeviceEntityByDeviceId(deviceId);
            List<ThresholdDto> thresholds = thresholdService.getDeviceThresholds(device);
            return ResponseEntity.ok(thresholds);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PutMapping("/{deviceId}/thresholds/{parameter}")
    public ResponseEntity<ThresholdDto> updateThreshold(
            @PathVariable String deviceId,
            @PathVariable String parameter,
            @RequestBody Map<String, Double> thresholdValues,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            Device device = deviceService.getDeviceEntityByDeviceId(deviceId);
            ThresholdParameter param = ThresholdParameter.valueOf(parameter.toUpperCase());
            Double minValue = thresholdValues.get("minValue");
            Double maxValue = thresholdValues.get("maxValue");

            if (minValue == null || maxValue == null) {
                return ResponseEntity.badRequest().build();
            }

            ThresholdDto updated = thresholdService.updateThreshold(device, param, minValue, maxValue);
            return ResponseEntity.ok(updated);

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    @PostMapping
    public ResponseEntity<DeviceDto> createDevice(
            @RequestBody Map<String, String> deviceData,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String deviceId = deviceData.get("deviceId");
            String name = deviceData.get("name");
            String location = deviceData.get("location");

            DeviceDto device = deviceService.createDevice(deviceId, name, location);
            return ResponseEntity.status(HttpStatus.CREATED).body(device);

        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    @PostMapping("/{deviceId}/request-verification")
    public ResponseEntity<?> requestDeviceSettingsVerification(
            @PathVariable Long deviceId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String userEmail = authentication.getName();
            verificationService.requestDeviceSettingsVerification(userEmail, deviceId);

            Map<String, String> response = Map.of("message", "Verification code sent to your email");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = Map.of("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PostMapping("/{deviceId}/verify-code")
    public ResponseEntity<?> verifyDeviceSettingsCode(
            @PathVariable Long deviceId,
            @RequestBody VerifyDeviceCodeRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String userEmail = authentication.getName();
            boolean verified = verificationService.verifyDeviceSettingsCode(userEmail, deviceId, request.getCode());

            if (verified) {
                Map<String, Object> response = Map.of("message", "Verification successful", "verified", true);
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> error = Map.of("message", "Invalid or expired verification code", "verified", false);
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
            }
        } catch (RuntimeException e) {
            Map<String, Object> error = Map.of("message", e.getMessage(), "verified", false);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PutMapping("/{deviceId}/password")
    public ResponseEntity<?> updateDevicePassword(
            @PathVariable Long deviceId,
            @RequestBody UpdateDevicePasswordRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            String userEmail = authentication.getName();
            verificationService.updateDevicePassword(userEmail, deviceId, request.getDevicePassword());

            Map<String, String> response = Map.of("message", "Device password updated successfully");
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, String> error = Map.of("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }
}
