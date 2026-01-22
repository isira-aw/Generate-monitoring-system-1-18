package com.generator.monitoring.service;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.repository.DeviceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class PredictionSchedulerService {

    private final DeviceRepository deviceRepository;
    private final PredictionService predictionService;

    /**
     * Collect prediction data for all devices every 30 minutes
     * Cron: 0 */30 * * * * = At minute 0 and 30 of every hour
     */
    @Scheduled(cron = "0 */30 * * * *")
    public void collectPredictionDataForAllDevices() {
        log.info("Starting scheduled prediction data collection for all devices");

        try {
            List<Device> devices = deviceRepository.findAll();
            log.info("Found {} devices to process", devices.size());

            int successCount = 0;
            int errorCount = 0;

            for (Device device : devices) {
                try {
                    predictionService.collectPredictionData(device.getDeviceId());
                    successCount++;
                } catch (Exception e) {
                    log.error("Error collecting prediction data for device: {}", device.getDeviceId(), e);
                    errorCount++;
                }
            }

            log.info("Completed prediction data collection. Success: {}, Errors: {}", successCount, errorCount);
        } catch (Exception e) {
            log.error("Error in scheduled prediction data collection", e);
        }
    }

    /**
     * Alternative: Run every 30 minutes using fixed delay
     * Uncomment this if you prefer fixed delay instead of cron
     */
    // @Scheduled(fixedDelay = 1800000) // 30 minutes in milliseconds
    // public void collectPredictionDataWithFixedDelay() {
    //     collectPredictionDataForAllDevices();
    // }
}
