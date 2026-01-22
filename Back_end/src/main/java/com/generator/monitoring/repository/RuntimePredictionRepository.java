package com.generator.monitoring.repository;

import com.generator.monitoring.entity.RuntimePrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuntimePredictionRepository extends JpaRepository<RuntimePrediction, Long> {

    /**
     * Find predictions by device and time range
     */
    @Query("SELECT p FROM RuntimePrediction p WHERE p.deviceId = :deviceId " +
           "AND p.predictedAt >= :startTime AND p.predictedAt <= :endTime " +
           "ORDER BY p.predictedAt DESC")
    List<RuntimePrediction> findByDeviceAndTimeRange(
        @Param("deviceId") String deviceId,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * Find latest prediction for a device by type
     */
    @Query("SELECT p FROM RuntimePrediction p WHERE p.deviceId = :deviceId " +
           "AND p.predictionType = :type " +
           "ORDER BY p.predictedAt DESC")
    List<RuntimePrediction> findLatestByDeviceAndType(
        @Param("deviceId") String deviceId,
        @Param("type") RuntimePrediction.PredictionType type
    );

    /**
     * Find predictions that need actual event data (for learning)
     */
    @Query("SELECT p FROM RuntimePrediction p WHERE p.deviceId = :deviceId " +
           "AND p.actualRuntimeHours IS NULL " +
           "AND p.predictedDepletionTime <= :now " +
           "ORDER BY p.predictedAt DESC")
    List<RuntimePrediction> findPendingActualEvents(
        @Param("deviceId") String deviceId,
        @Param("now") LocalDateTime now
    );

    /**
     * Count predictions by device and type
     */
    @Query("SELECT COUNT(p) FROM RuntimePrediction p WHERE p.deviceId = :deviceId " +
           "AND p.predictionType = :type")
    long countByDeviceAndType(
        @Param("deviceId") String deviceId,
        @Param("type") RuntimePrediction.PredictionType type
    );

    /**
     * Get recent predictions with actual data (for accuracy metrics)
     */
    @Query("SELECT p FROM RuntimePrediction p WHERE p.deviceId = :deviceId " +
           "AND p.actualRuntimeHours IS NOT NULL " +
           "ORDER BY p.predictedAt DESC")
    List<RuntimePrediction> findRecentActuals(
        @Param("deviceId") String deviceId
    );
}
