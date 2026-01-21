package com.generator.monitoring.controller;

import com.generator.monitoring.dto.HistoryDataPoint;
import com.generator.monitoring.dto.HistoryQueryRequest;
import com.generator.monitoring.service.HistoryService;
import com.generator.monitoring.service.PdfReportService;
import com.generator.monitoring.service.TelemetryCleanupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/history")
@CrossOrigin(origins = "*")
public class HistoryController {

    @Autowired
    private HistoryService historyService;

    @Autowired
    private PdfReportService pdfReportService;

    @Autowired
    private TelemetryCleanupService cleanupService;

    /**
     * Query historical data
     */
    @PostMapping("/query")
    public ResponseEntity<List<HistoryDataPoint>> queryHistory(@RequestBody HistoryQueryRequest request) {
        try {
            List<HistoryDataPoint> dataPoints = historyService.queryHistory(
                    request.getDeviceId(),
                    request.getStartTime(),
                    request.getEndTime(),
                    request.getParameters()
            );
            return ResponseEntity.ok(dataPoints);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get historical data with query parameters
     */
    @GetMapping("/data/{deviceId}")
    public ResponseEntity<List<HistoryDataPoint>> getHistory(
            @PathVariable String deviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) List<String> parameters) {
        try {
            List<HistoryDataPoint> dataPoints = historyService.queryHistory(
                    deviceId, startTime, endTime, parameters
            );
            return ResponseEntity.ok(dataPoints);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Generate PDF report
     */
    @PostMapping("/report/pdf")
    public ResponseEntity<byte[]> generatePdfReport(@RequestBody HistoryQueryRequest request) {
        try {
            byte[] pdfBytes = pdfReportService.generateReport(
                    request.getDeviceId(),
                    request.getStartTime(),
                    request.getEndTime(),
                    request.getParameters()
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                    "generator_report_" + request.getDeviceId() + "_" +
                            System.currentTimeMillis() + ".pdf");

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get PDF report with query parameters
     */
    @GetMapping("/report/pdf/{deviceId}")
    public ResponseEntity<byte[]> getPdfReport(
            @PathVariable String deviceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) List<String> parameters) {
        try {
            byte[] pdfBytes = pdfReportService.generateReport(
                    deviceId, startTime, endTime, parameters
            );

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment",
                    "generator_report_" + deviceId + "_" + System.currentTimeMillis() + ".pdf");

            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all available parameters
     */
    @GetMapping("/parameters")
    public ResponseEntity<Map<String, String>> getParameters() {
        return ResponseEntity.ok(historyService.getParameterDisplayNames());
    }

    /**
     * Trigger manual cleanup
     */
    @PostMapping("/cleanup")
    public ResponseEntity<Map<String, Object>> triggerCleanup() {
        try {
            int deletedCount = cleanupService.performManualCleanup();
            return ResponseEntity.ok(Map.of(
                    "message", "Cleanup completed successfully",
                    "deletedRecords", deletedCount
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Get count of old records
     */
    @GetMapping("/cleanup/count")
    public ResponseEntity<Map<String, Object>> getOldRecordsCount() {
        try {
            long count = cleanupService.getOldRecordsCount();
            return ResponseEntity.ok(Map.of(
                    "oldRecordsCount", count,
                    "retentionWeeks", 6
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
