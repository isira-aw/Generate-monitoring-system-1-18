package com.generator.monitoring.service;

import com.generator.monitoring.repository.TelemetryHistoryRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Service to clean up telemetry data older than 6 weeks
 * Runs daily at 2 AM
 */
@Service
public class TelemetryCleanupService {

    private static final Logger logger = LoggerFactory.getLogger(TelemetryCleanupService.class);
    private static final int RETENTION_WEEKS = 6;

    @Autowired
    private TelemetryHistoryRepository telemetryHistoryRepository;

    /**
     * Scheduled job to delete telemetry data older than 6 weeks
     * Runs daily at 2:00 AM
     */
    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldTelemetryData() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusWeeks(RETENTION_WEEKS);
            logger.info("Starting telemetry cleanup for data older than: {}", cutoffDate);

            // Count records before deletion
            long recordCount = telemetryHistoryRepository.countByTimestampBefore(cutoffDate);

            if (recordCount == 0) {
                logger.info("No telemetry records to clean up");
                return;
            }

            // Delete old records
            int deletedCount = telemetryHistoryRepository.deleteByTimestampBefore(cutoffDate);

            logger.info("Telemetry cleanup completed. Deleted {} records older than {} weeks",
                    deletedCount, RETENTION_WEEKS);

        } catch (Exception e) {
            logger.error("Error during telemetry cleanup: {}", e.getMessage(), e);
        }
    }

    /**
     * Manual cleanup method that can be called via API
     */
    @Transactional
    public int performManualCleanup() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusWeeks(RETENTION_WEEKS);
        logger.info("Manual telemetry cleanup triggered for data older than: {}", cutoffDate);

        int deletedCount = telemetryHistoryRepository.deleteByTimestampBefore(cutoffDate);

        logger.info("Manual cleanup completed. Deleted {} records", deletedCount);
        return deletedCount;
    }

    /**
     * Get count of records that would be deleted
     */
    public long getOldRecordsCount() {
        LocalDateTime cutoffDate = LocalDateTime.now().minusWeeks(RETENTION_WEEKS);
        return telemetryHistoryRepository.countByTimestampBefore(cutoffDate);
    }
}
