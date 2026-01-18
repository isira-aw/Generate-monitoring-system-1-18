package com.generator.monitoring.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${mail.from.address}")
    private String fromAddress;

    @Async
    public void sendPasswordResetEmail(String to, String resetCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject("Password Reset Request");
            message.setText(String.format(
                    "You have requested to reset your password.\n\n" +
                    "Your password reset code is: %s\n\n" +
                    "This code will expire in 15 minutes.\n\n" +
                    "If you did not request this password reset, please ignore this email.",
                    resetCode
            ));
            mailSender.send(message);
            log.info("Password reset email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send password reset email to: {}", to, e);
        }
    }

    @Async
    public void sendDeviceSettingsVerificationEmail(String to, String verificationCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromAddress);
            message.setTo(to);
            message.setSubject("Device Settings Verification Code");
            message.setText(String.format(
                    "Someone is trying to access device settings.\n\n" +
                    "Your verification code is: %s\n\n" +
                    "This code will expire in 10 minutes.\n\n" +
                    "If you did not attempt to access device settings, please secure your account.",
                    verificationCode
            ));
            mailSender.send(message);
            log.info("Device settings verification email sent to: {}", to);
        } catch (Exception e) {
            log.error("Failed to send device settings verification email to: {}", to, e);
        }
    }
}
