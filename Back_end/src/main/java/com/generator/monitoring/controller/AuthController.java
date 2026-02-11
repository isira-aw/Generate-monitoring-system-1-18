package com.generator.monitoring.controller;

import com.generator.monitoring.dto.*;
import com.generator.monitoring.service.AuthService;
import com.generator.monitoring.service.UserProfileService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserProfileService userProfileService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            UserDto user = authService.register(request);
            return ResponseEntity.ok(new AuthResponse("User registered successfully", user));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new AuthResponse(e.getMessage(), null));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        try {
            String token = authService.login(request);
            UserDto user = authService.getUserByEmail(request.getEmail());

            // Set JWT in HttpOnly cookie with SameSite attribute for cross-origin compatibility
            ResponseCookie cookie = ResponseCookie.from("jwt", token)
                    .httpOnly(true)
                    .secure(false) // Set to true in production with HTTPS
                    .path("/")
                    .maxAge(24 * 60 * 60) // 24 hours
                    .sameSite("Lax")
                    .build();

            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

            return ResponseEntity.ok(new AuthResponse("Login successful", user));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new AuthResponse("Invalid credentials", null));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<AuthResponse> logout(HttpServletResponse response) {
        ResponseCookie cookie = ResponseCookie.from("jwt", "")
                .httpOnly(true)
                .secure(false)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();

        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());

        return ResponseEntity.ok(new AuthResponse("Logout successful", null));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String email = authentication.getName();
        UserDto user = authService.getUserByEmail(email);
        return ResponseEntity.ok(user);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<AuthResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            userProfileService.requestPasswordReset(request.getEmail());
            return ResponseEntity.ok(new AuthResponse("Password reset code sent to your email", null));
        } catch (RuntimeException e) {
            // Don't reveal if email exists or not for security
            return ResponseEntity.ok(new AuthResponse("If the email exists, a password reset code will be sent", null));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<AuthResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            userProfileService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
            return ResponseEntity.ok(new AuthResponse("Password reset successfully", null));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new AuthResponse(e.getMessage(), null));
        }
    }
}
