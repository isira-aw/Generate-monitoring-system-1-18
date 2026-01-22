package com.generator.monitoring.repository;

import com.generator.monitoring.entity.AIPredictionHistory;
import com.generator.monitoring.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AIPredictionHistoryRepository extends JpaRepository<AIPredictionHistory, Long> {

    /**
     * Find predictions by device and type
     */
    @Query("SELECT p FROM AIPredictionHistory p WHERE p.device = :device " +
           "AND p.predictionType = :type " +
           "ORDER BY p.timestamp DESC")
    List<AIPredictionHistory> findByDeviceAndType(
        @Param("device") Device device,
        @Param("type") String type
    );

    /**
     * Find recent predictions with actual values for training
     */
    @Query("SELECT p FROM AIPredictionHistory p WHERE p.device = :device " +
           "AND p.predictionType = :type " +
           "AND p.actualValue IS NOT NULL " +
           "AND p.timestamp >= :since " +
           "ORDER BY p.timestamp DESC")
    List<AIPredictionHistory> findTrainingData(
        @Param("device") Device device,
        @Param("type") String type,
        @Param("since") LocalDateTime since
    );

    /**
     * Find latest N predictions for a device
     */
    @Query("SELECT p FROM AIPredictionHistory p WHERE p.device = :device " +
           "AND p.predictionType = :type " +
           "ORDER BY p.timestamp DESC")
    List<AIPredictionHistory> findLatestPredictions(
        @Param("device") Device device,
        @Param("type") String type
    );
}
