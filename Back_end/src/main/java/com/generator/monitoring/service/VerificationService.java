package com.generator.monitoring.service;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.User;
import com.generator.monitoring.entity.VerificationCode;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.UserRepository;
import com.generator.monitoring.repository.VerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationCodeRepository verificationCodeRepository;
    private final UserRepository userRepository;
    private final DeviceRepository deviceRepository;
    private final EmailService emailService;

    @Transactional
    public void requestDeviceSettingsVerification(String userEmail, Long deviceId) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));

        // Check if user has access to this device
        if (!device.getUsers().contains(user)) {
            throw new RuntimeException("You don't have access to this device");
        }

        // Generate 4-digit code
        String code = String.format("%04d", new Random().nextInt(10000));

        // Create verification code
        VerificationCode verificationCode = new VerificationCode();
        verificationCode.setCode(code);
        verificationCode.setEmail(userEmail);
        verificationCode.setType(VerificationCode.VerificationType.DEVICE_SETTINGS);
        verificationCode.setDeviceId(deviceId);
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        verificationCode.setUsed(false);

        verificationCodeRepository.save(verificationCode);

        // Send email
        emailService.sendDeviceSettingsVerificationEmail(userEmail, code);
    }

    @Transactional
    public boolean verifyDeviceSettingsCode(String userEmail, Long deviceId, String code) {
        VerificationCode verificationCode = verificationCodeRepository
                .findByCodeAndEmailAndTypeAndUsedFalseAndExpiresAtAfter(
                        code,
                        userEmail,
                        VerificationCode.VerificationType.DEVICE_SETTINGS,
                        LocalDateTime.now()
                )
                .orElse(null);

        if (verificationCode == null) {
            return false;
        }

        if (!verificationCode.getDeviceId().equals(deviceId)) {
            return false;
        }

        // Mark code as used
        verificationCode.setUsed(true);
        verificationCodeRepository.save(verificationCode);

        return true;
    }

    @Transactional
    public void updateDevicePassword(String userEmail, Long deviceId, String newPassword) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found"));

        // Check if user has access to this device
        if (!device.getUsers().contains(user)) {
            throw new RuntimeException("You don't have access to this device");
        }

        device.setDevicePassword(newPassword);
        deviceRepository.save(device);
    }
}
