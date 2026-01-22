package com.generator.monitoring.repository;

import com.generator.monitoring.entity.BatteryPredictionHistory;
import com.generator.monitoring.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BatteryPredictionHistoryRepository extends JpaRepository<BatteryPredictionHistory, Long> {

    /**
     * Find latest 10 battery records for a device (for prediction calculation)
     */
    @Query("SELECT b FROM BatteryPredictionHistory b WHERE b.device = :device " +
           "ORDER BY b.timestamp DESC")
    List<BatteryPredictionHistory> findTop10ByDeviceOrderByTimestampDesc(@Param("device") Device device);

    /**
     * Count records for a device
     */
    @Query("SELECT COUNT(b) FROM BatteryPredictionHistory b WHERE b.device = :device")
    long countByDevice(@Param("device") Device device);

    /**
     * Delete oldest records for a device beyond the limit
     */
    @Modifying
    @Query("DELETE FROM BatteryPredictionHistory b WHERE b.id IN " +
           "(SELECT b2.id FROM BatteryPredictionHistory b2 WHERE b2.device = :device " +
           "ORDER BY b2.timestamp DESC OFFSET :limit)")
    void deleteOldestRecordsBeyondLimit(@Param("device") Device device, @Param("limit") int limit);

    /**
     * Delete all records for a device older than a specific timestamp
     */
    @Modifying
    @Query("DELETE FROM BatteryPredictionHistory b WHERE b.device = :device AND b.timestamp < :timestamp")
    void deleteByDeviceAndTimestampBefore(@Param("device") Device device, @Param("timestamp") LocalDateTime timestamp);
}
