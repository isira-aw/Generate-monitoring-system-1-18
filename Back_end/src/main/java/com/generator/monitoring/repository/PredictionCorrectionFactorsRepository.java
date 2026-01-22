package com.generator.monitoring.repository;

import com.generator.monitoring.entity.PredictionCorrectionFactors;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PredictionCorrectionFactorsRepository extends JpaRepository<PredictionCorrectionFactors, Long> {

    /**
     * Find correction factors by device ID
     */
    Optional<PredictionCorrectionFactors> findByDeviceId(String deviceId);

    /**
     * Check if correction factors exist for device
     */
    boolean existsByDeviceId(String deviceId);
}
