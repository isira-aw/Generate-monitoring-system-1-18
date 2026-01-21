package com.generator.monitoring.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HistoryQueryRequest {
    private String deviceId;
    private String startTime;
    private String endTime;
    private List<String> parameters;

    /**
     * Parse ISO-8601 timestamp to LocalDateTime
     */
    public LocalDateTime getParsedStartTime() {
        return parseIsoTimestamp(startTime);
    }

    /**
     * Parse ISO-8601 timestamp to LocalDateTime
     */
    public LocalDateTime getParsedEndTime() {
        return parseIsoTimestamp(endTime);
    }

    private LocalDateTime parseIsoTimestamp(String timestamp) {
        if (timestamp == null) {
            return null;
        }
        // Parse ISO-8601 with Z timezone to LocalDateTime
        Instant instant = Instant.parse(timestamp);
        return LocalDateTime.ofInstant(instant, ZoneId.systemDefault());
    }
}
