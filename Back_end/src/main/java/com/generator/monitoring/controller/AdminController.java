package com.generator.monitoring.controller;

import com.generator.monitoring.dto.*;
import com.generator.monitoring.service.AdminService;
import com.generator.monitoring.service.DeviceService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private AdminService adminService;

    @Autowired
    private DeviceService deviceService;

    // ========== AUTH ENDPOINTS ==========

    @PostMapping("/login")
    public ResponseEntity<AdminAuthResponse> login(
            @Valid @RequestBody AdminLoginRequest request,
            HttpServletResponse response) {
        try {
            String token = adminService.login(request.getEmail(), request.getPassword());
            AdminDto admin = adminService.getAdminByEmail(request.getEmail());

            ResponseCookie cookie = ResponseCookie.from("admin_jwt", token)
                    .httpOnly(true)
                    .secure(false)
                    .path("/")
                    .maxAge(24 * 60 * 60)
                    .sameSite("Lax")
                    .build();

            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            return ResponseEntity.ok(new AdminAuthResponse("Login successful", token, admin));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AdminAuthResponse("Invalid credentials", null, null));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("admin_jwt", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }

    @GetMapping("/me")
    public ResponseEntity<AdminDto> getCurrentAdmin(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getName();
        if (!adminService.isAdmin(email)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        AdminDto admin = adminService.getAdminByEmail(email);
        return ResponseEntity.ok(admin);
    }

    // ========== ADMIN MANAGEMENT ENDPOINTS ==========

    @GetMapping("/admins")
    public ResponseEntity<List<AdminDto>> getAllAdmins(Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(adminService.getAllAdmins());
    }

    @PostMapping("/admins")
    public ResponseEntity<?> createAdmin(
            @Valid @RequestBody CreateAdminRequest request,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            AdminDto admin = adminService.createAdmin(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(admin);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/admins/{id}")
    public ResponseEntity<?> deleteAdmin(
            @PathVariable Long id,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            adminService.deleteAdmin(id);
            return ResponseEntity.ok(Map.of("message", "Admin deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ========== DEVICE MANAGEMENT ENDPOINTS ==========

    @GetMapping("/devices")
    public ResponseEntity<List<DeviceDto>> getAllDevices(Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        return ResponseEntity.ok(deviceService.getAllDevices());
    }

    @PostMapping("/devices/register")
    public ResponseEntity<?> registerDevice(
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            DeviceDto device = deviceService.registerDevice(
                    request.get("deviceId"),
                    request.get("devicePassword"),
                    request.get("name"),
                    request.get("location")
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(device);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/devices/{deviceId}")
    public ResponseEntity<?> updateDevice(
            @PathVariable String deviceId,
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            String name = (String) request.get("name");
            String location = (String) request.get("location");
            Boolean active = request.get("active") != null ? (Boolean) request.get("active") : null;

            DeviceDto device = deviceService.updateDevice(deviceId, name, location, active);
            return ResponseEntity.ok(device);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/devices/{deviceId}/password")
    public ResponseEntity<?> updateDevicePassword(
            @PathVariable String deviceId,
            @RequestBody Map<String, String> request,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            deviceService.adminUpdateDevicePassword(deviceId, request.get("devicePassword"));
            return ResponseEntity.ok(Map.of("message", "Device password updated successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/devices/{deviceId}/license")
    public ResponseEntity<?> toggleDeviceLicense(
            @PathVariable String deviceId,
            @RequestBody Map<String, Boolean> request,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            Boolean enabled = request.get("licenseEnabled");
            if (enabled == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "licenseEnabled is required"));
            }

            DeviceDto device = deviceService.toggleDeviceLicense(deviceId, enabled);
            return ResponseEntity.ok(device);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/devices/{deviceId}")
    public ResponseEntity<?> deleteDevice(
            @PathVariable String deviceId,
            Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        try {
            deviceService.adminDeleteDevice(deviceId);
            return ResponseEntity.ok(Map.of("message", "Device deleted successfully"));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    // ========== STATS ENDPOINT ==========

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats(Authentication authentication) {
        if (!isAdminAuthenticated(authentication)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }

        long totalAdmins = adminService.getAllAdmins().size();
        long totalDevices = deviceService.getAllDevices().size();
        long activeDevices = deviceService.getAllDevices().stream()
                .filter(DeviceDto::getActive)
                .count();
        long licensedDevices = deviceService.getAllDevices().stream()
                .filter(DeviceDto::getLicenseEnabled)
                .count();

        return ResponseEntity.ok(Map.of(
                "totalAdmins", totalAdmins,
                "totalDevices", totalDevices,
                "activeDevices", activeDevices,
                "licensedDevices", licensedDevices
        ));
    }

    private boolean isAdminAuthenticated(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        return adminService.isAdmin(authentication.getName());
    }
}
