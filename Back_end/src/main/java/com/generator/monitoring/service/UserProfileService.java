package com.generator.monitoring.service;

import com.generator.monitoring.dto.ChangePasswordRequest;
import com.generator.monitoring.dto.UpdateProfileRequest;
import com.generator.monitoring.dto.UserDto;
import com.generator.monitoring.entity.User;
import com.generator.monitoring.entity.VerificationCode;
import com.generator.monitoring.repository.UserRepository;
import com.generator.monitoring.repository.VerificationCodeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserRepository userRepository;
    private final VerificationCodeRepository verificationCodeRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    @Transactional
    public UserDto updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName());
        }

        if (request.getMobileNumber() != null) {
            user.setMobileNumber(request.getMobileNumber());
        }

        if (request.getEmail() != null && !request.getEmail().equals(email)) {
            // Check if new email is already taken
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        User savedUser = userRepository.save(user);
        return convertToDto(savedUser);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    @Transactional
    public void requestPasswordReset(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Generate 4-digit code
        String code = String.format("%04d", new Random().nextInt(10000));

        // Create verification code
        VerificationCode verificationCode = new VerificationCode();
        verificationCode.setCode(code);
        verificationCode.setEmail(email);
        verificationCode.setType(VerificationCode.VerificationType.PASSWORD_RESET);
        verificationCode.setExpiresAt(LocalDateTime.now().plusMinutes(15));
        verificationCode.setUsed(false);

        verificationCodeRepository.save(verificationCode);

        // Send email
        emailService.sendPasswordResetEmail(email, code);
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        VerificationCode verificationCode = verificationCodeRepository
                .findByCodeAndEmailAndTypeAndUsedFalseAndExpiresAtAfter(
                        code,
                        email,
                        VerificationCode.VerificationType.PASSWORD_RESET,
                        LocalDateTime.now()
                )
                .orElseThrow(() -> new RuntimeException("Invalid or expired verification code"));

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Mark code as used
        verificationCode.setUsed(true);
        verificationCodeRepository.save(verificationCode);
    }

    private UserDto convertToDto(User user) {
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setName(user.getName());
        dto.setMobileNumber(user.getMobileNumber());
        return dto;
    }
}
