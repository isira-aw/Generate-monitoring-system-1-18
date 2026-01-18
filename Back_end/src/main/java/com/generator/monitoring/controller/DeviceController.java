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

        String userEmail = authentication.getName();
        DeviceDto device = deviceService.attachDeviceToUser(
                request.getDeviceId(),
                request.getDevicePassword(),
                userEmail
        );
        return ResponseEntity.ok(device);
    }

    @PostMapping("/register")
    public ResponseEntity<DeviceDto> registerDevice(
            @RequestBody RegisterDeviceRequest request) {

        DeviceDto device = deviceService.registerDevice(
                request.getDeviceId(),
                request.getDevicePassword(),
                request.getName(),
                request.getLocation()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    }

    @GetMapping("/{deviceId}/dashboard")
    public ResponseEntity<DeviceDto> getDeviceDashboard(@PathVariable String deviceId) {
        // Public endpoint - no authentication required
        DeviceDto device = deviceService.getDeviceByDeviceId(deviceId);
        return ResponseEntity.ok(device);
    }

    @GetMapping("/{deviceId}/thresholds")
    public ResponseEntity<List<ThresholdDto>> getDeviceThresholds(
            @PathVariable String deviceId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        Device device = deviceService.getDeviceEntityByDeviceId(deviceId);
        List<ThresholdDto> thresholds = thresholdService.getDeviceThresholds(device);
        return ResponseEntity.ok(thresholds);
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

        Device device = deviceService.getDeviceEntityByDeviceId(deviceId);
        ThresholdParameter param = ThresholdParameter.valueOf(parameter.toUpperCase());
        Double minValue = thresholdValues.get("minValue");
        Double maxValue = thresholdValues.get("maxValue");

        if (minValue == null || maxValue == null) {
            return ResponseEntity.badRequest().build();
        }

        ThresholdDto updated = thresholdService.updateThreshold(device, param, minValue, maxValue);
        return ResponseEntity.ok(updated);
    }

    @PostMapping
    public ResponseEntity<DeviceDto> createDevice(
            @RequestBody Map<String, String> deviceData,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String deviceId = deviceData.get("deviceId");
        String name = deviceData.get("name");
        String location = deviceData.get("location");

        DeviceDto device = deviceService.createDevice(deviceId, name, location);
        return ResponseEntity.status(HttpStatus.CREATED).body(device);
    }

    @PostMapping("/{deviceId}/request-verification")
    public ResponseEntity<?> requestDeviceSettingsVerification(
            @PathVariable String deviceId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        verificationService.requestDeviceSettingsVerification(userEmail, deviceId);

        Map<String, String> response = Map.of("message", "Verification code sent to your email");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{deviceId}/verify-code")
    public ResponseEntity<?> verifyDeviceSettingsCode(
            @PathVariable String deviceId,
            @RequestBody VerifyDeviceCodeRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        boolean verified = verificationService.verifyDeviceSettingsCode(userEmail, deviceId, request.getCode());

        if (verified) {
            Map<String, Object> response = Map.of("message", "Verification successful", "verified", true);
            return ResponseEntity.ok(response);
        } else {
            Map<String, Object> error = Map.of("message", "Invalid or expired verification code", "verified", false);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }
    }

    @PutMapping("/{deviceId}/password")
    public ResponseEntity<?> updateDevicePassword(
            @PathVariable String deviceId,
            @RequestBody UpdateDevicePasswordRequest request,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        verificationService.updateDevicePassword(userEmail, deviceId, request.getDevicePassword());

        Map<String, String> response = Map.of("message", "Device password updated successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{deviceId}/detach")
    public ResponseEntity<?> detachDevice(
            @PathVariable String deviceId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        deviceService.detachDeviceFromUser(deviceId, userEmail);

        Map<String, String> response = Map.of("message", "Device detached successfully");
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{deviceId}")
    public ResponseEntity<?> deleteDevice(
            @PathVariable String deviceId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        deviceService.deleteDevice(deviceId, userEmail);

        Map<String, String> response = Map.of("message", "Device deleted successfully");
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{deviceId}/info")
    public ResponseEntity<DeviceDto> updateDeviceInfo(
            @PathVariable String deviceId,
            @RequestBody Map<String, String> deviceData,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String userEmail = authentication.getName();
        String name = deviceData.get("name");
        String location = deviceData.get("location");

        DeviceDto device = deviceService.updateDeviceInfo(deviceId, name, location, userEmail);
        return ResponseEntity.ok(device);
    }
}
