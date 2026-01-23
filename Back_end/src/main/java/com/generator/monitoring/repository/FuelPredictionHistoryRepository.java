package com.generator.monitoring.repository;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.FuelPredictionHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FuelPredictionHistoryRepository extends JpaRepository<FuelPredictionHistory, Long> {

    /**
     * Find latest 10 fuel records for a device (for prediction calculation)
     */
    @Query("SELECT f FROM FuelPredictionHistory f WHERE f.device = :device " +
           "ORDER BY f.timestamp DESC")
    List<FuelPredictionHistory> findTop10ByDeviceOrderByTimestampDesc(@Param("device") Device device);

    /**
     * Count records for a device
     */
    @Query("SELECT COUNT(f) FROM FuelPredictionHistory f WHERE f.device = :device")
    long countByDevice(@Param("device") Device device);

    /**
     * Delete oldest records for a device beyond the limit
     */
    @Modifying
    @Query("DELETE FROM FuelPredictionHistory f WHERE f.id IN " +
           "(SELECT f2.id FROM FuelPredictionHistory f2 WHERE f2.device = :device " +
           "ORDER BY f2.timestamp DESC OFFSET :limit)")
    void deleteOldestRecordsBeyondLimit(@Param("device") Device device, @Param("limit") int limit);

    /**
     * Delete all records for a device older than a specific timestamp
     */
    @Modifying
    @Query("DELETE FROM FuelPredictionHistory f WHERE f.device = :device AND f.timestamp < :timestamp")
    void deleteByDeviceAndTimestampBefore(@Param("device") Device device, @Param("timestamp") LocalDateTime timestamp);
}
