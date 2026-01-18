package com.generator.monitoring.repository;

import com.generator.monitoring.entity.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    Optional<VerificationCode> findByCodeAndEmailAndTypeAndUsedFalseAndExpiresAtAfter(
            String code, String email, VerificationCode.VerificationType type, LocalDateTime now);

    Optional<VerificationCode> findByEmailAndTypeAndUsedFalseAndExpiresAtAfter(
            String email, VerificationCode.VerificationType type, LocalDateTime now);

    void deleteByExpiresAtBefore(LocalDateTime now);
}
