package com.generator.monitoring.service;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.User;
import com.generator.monitoring.entity.VerificationCode;
import com.generator.monitoring.exception.*;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.UserRepository;
import com.generator.monitoring.repository.VerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private static final Logger logger = LoggerFactory.getLogger(VerificationService.class);

    private final VerificationCodeRepository verificationCodeRepository;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final EmailService emailService;

    @Transactional
    public void requestDeviceSettingsVerification(String userEmail, Long deviceId) {
        logger.info("Requesting device settings verification for user: {} and device ID: {}", userEmail, deviceId);

        // Input validation
        if (userEmail == null || userEmail.trim().isEmpty()) {
            logger.error("Verification request failed: User email is empty");
            throw new InvalidInputException("User email cannot be empty");
        }

        if (deviceId == null) {
            logger.error("Verification request failed: Device ID is null");
            throw new InvalidInputException("Device ID cannot be null");
        }

        final String finalUserEmail = userEmail.trim();

        // Find user
        User user = userRepository.findByEmail(finalUserEmail)
                .orElseThrow(() -> {
                    logger.error("User not found: {}", finalUserEmail);
                    return new UserNotFoundException("User not found");
                });

        // Find device
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> {
                    logger.error("Device not found with ID: {}", deviceId);
                    return new DeviceNotFoundException("Device not found");
                });

        // Check if user has access to this device
        boolean hasAccess = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (!hasAccess) {
            logger.error("User {} does not have access to device {}", finalUserEmail, deviceId);
            throw new DeviceAccessDeniedException("You don't have access to this device");
        }

        // Generate 4-digit code
        String code = String.format("%04d", new Random().nextInt(10000));

        // Create verification code
        VerificationCode verificationCode = new VerificationCode();
        verificationCode.setCode(code);
        verificationCode.setEmail(finalUserEmail);
        verificationCode.setType(VerificationCode.VerificationType.DEVICE_SETTINGS);
        verificationCode.setDeviceId(deviceId);
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        verificationCode.setUsed(false);

        verificationCodeRepository.save(verificationCode);

        // Send email
        emailService.sendDeviceSettingsVerificationEmail(finalUserEmail, code);

        logger.info("Verification code sent successfully to user: {}", finalUserEmail);
    }

    @Transactional
    public boolean verifyDeviceSettingsCode(String userEmail, Long deviceId, String code) {
        logger.info("Verifying device settings code for user: {} and device ID: {}", userEmail, deviceId);

        // Input validation
        if (userEmail == null || userEmail.trim().isEmpty()) {
            logger.error("Verification failed: User email is empty");
            throw new InvalidInputException("User email cannot be empty");
        }

        if (deviceId == null) {
            logger.error("Verification failed: Device ID is null");
            throw new InvalidInputException("Device ID cannot be null");
        }

        if (code == null || code.trim().isEmpty()) {
            logger.error("Verification failed: Verification code is empty");
            throw new InvalidInputException("Verification code cannot be empty");
        }

        VerificationCode verificationCode = verificationCodeRepository
                .findByCodeAndEmailAndTypeAndUsedFalseAndExpiresAtAfter(
                        code.trim(),
                        userEmail.trim(),
                        VerificationCode.VerificationType.DEVICE_SETTINGS,
                        LocalDateTime.now()
                )
                .orElse(null);

        if (verificationCode == null) {
            logger.warn("Invalid or expired verification code for user: {}", userEmail);
            return false;
        }

        if (!verificationCode.getDeviceId().equals(deviceId)) {
            logger.warn("Device ID mismatch in verification code for user: {}", userEmail);
            return false;
        }

        // Mark code as used
        verificationCode.setUsed(true);
        verificationCodeRepository.save(verificationCode);

        logger.info("Verification code validated successfully for user: {}", userEmail);
        return true;
    }

    @Transactional
    public void updateDevicePassword(String userEmail, Long deviceId, String newPassword) {
        logger.info("Updating device password for device ID: {} by user: {}", deviceId, userEmail);

        // Input validation
        if (userEmail == null || userEmail.trim().isEmpty()) {
            logger.error("Update password failed: User email is empty");
            throw new InvalidInputException("User email cannot be empty");
        }

        if (deviceId == null) {
            logger.error("Update password failed: Device ID is null");
            throw new InvalidInputException("Device ID cannot be null");
        }

        if (newPassword == null || newPassword.trim().isEmpty()) {
            logger.error("Update password failed: New password is empty");
            throw new InvalidInputException("New password cannot be empty");
        }

        final String finalUserEmail = userEmail.trim();

        // Find user
        User user = userRepository.findByEmail(finalUserEmail)
                .orElseThrow(() -> {
                    logger.error("User not found: {}", finalUserEmail);
                    return new UserNotFoundException("User not found");
                });

        // Find device
        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> {
                    logger.error("Device not found with ID: {}", deviceId);
                    return new DeviceNotFoundException("Device not found");
                });

        // Check if user has access to this device
        boolean hasAccess = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (!hasAccess) {
            logger.error("User {} does not have access to device {}", finalUserEmail, deviceId);
            throw new DeviceAccessDeniedException("You don't have access to this device");
        }

        // Update password
        device.setDevicePassword(newPassword.trim());
        deviceRepository.save(device);

        logger.info("Device password updated successfully for device ID: {}", deviceId);
    }
}
