package com.generator.monitoring.controller;

import com.generator.monitoring.dto.DeviceDto;
import com.generator.monitoring.dto.ThresholdDto;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.enums.ThresholdParameter;
import com.generator.monitoring.service.DeviceService;
import com.generator.monitoring.service.ThresholdService;
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

    @GetMapping
    public ResponseEntity<List<DeviceDto>> getAllDevices() {
        return ResponseEntity.ok(deviceService.getAllDevices());
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
}
