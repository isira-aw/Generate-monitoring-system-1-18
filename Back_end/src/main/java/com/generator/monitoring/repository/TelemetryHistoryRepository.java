package com.generator.monitoring.repository;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.TelemetryHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TelemetryHistoryRepository extends JpaRepository<TelemetryHistory, Long> {

    /**
     * Find telemetry records by device and time range
     */
    @Query("SELECT t FROM TelemetryHistory t WHERE t.device = :device " +
           "AND t.timestamp >= :startTime AND t.timestamp <= :endTime " +
           "ORDER BY t.timestamp DESC")
    List<TelemetryHistory> findByDeviceAndTimeRange(
        @Param("device") Device device,
        @Param("startTime") LocalDateTime startTime,
        @Param("endTime") LocalDateTime endTime
    );

    /**
     * Delete records older than specified date
     * Returns number of deleted records
     */
    @Modifying
    @Query("DELETE FROM TelemetryHistory t WHERE t.timestamp < :cutoffDate")
    int deleteByTimestampBefore(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Count records older than specified date
     */
    @Query("SELECT COUNT(t) FROM TelemetryHistory t WHERE t.timestamp < :cutoffDate")
    long countByTimestampBefore(@Param("cutoffDate") LocalDateTime cutoffDate);

    /**
     * Find latest N records for a device
     */
    @Query("SELECT t FROM TelemetryHistory t WHERE t.device = :device " +
           "ORDER BY t.timestamp DESC")
    List<TelemetryHistory> findLatestByDevice(@Param("device") Device device);
}
