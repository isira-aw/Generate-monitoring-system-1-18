package com.generator.monitoring.repository;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.PredictionMetrics;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PredictionMetricsRepository extends JpaRepository<PredictionMetrics, Long> {

    /**
     * Find prediction metrics by device
     */
    @Query("SELECT p FROM PredictionMetrics p WHERE p.device = :device")
    Optional<PredictionMetrics> findByDevice(@Param("device") Device device);

    /**
     * Check if metrics exist for a device
     */
    @Query("SELECT COUNT(p) > 0 FROM PredictionMetrics p WHERE p.device = :device")
    boolean existsByDevice(@Param("device") Device device);
}
