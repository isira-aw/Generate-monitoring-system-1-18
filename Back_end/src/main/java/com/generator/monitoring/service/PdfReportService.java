package com.generator.monitoring.service;

import com.generator.monitoring.dto.HistoryDataPoint;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Service
public class PdfReportService {

    private static final Logger logger = LoggerFactory.getLogger(PdfReportService.class);
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Autowired
    private HistoryService historyService;

    /**
     * Generate PDF report for historical data
     */
    public byte[] generateReport(String deviceId, LocalDateTime startTime, LocalDateTime endTime,
                                  List<String> parameters) {
        try {
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            PdfWriter writer = new PdfWriter(baos);
            PdfDocument pdf = new PdfDocument(writer);
            Document document = new Document(pdf);

            // Add title
            Paragraph title = new Paragraph("Generator Monitoring Report")
                    .setFontSize(20)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER);
            document.add(title);

            // Add device info and time range
            document.add(new Paragraph("Device ID: " + deviceId).setFontSize(12));
            document.add(new Paragraph("Report Period: " + startTime.format(DATE_FORMATTER) +
                    " to " + endTime.format(DATE_FORMATTER)).setFontSize(12));
            document.add(new Paragraph("\n"));

            // Get parameter display names
            Map<String, String> displayNames = historyService.getParameterDisplayNames();

            // Query historical data
            List<HistoryDataPoint> dataPoints = historyService.queryHistory(deviceId, startTime, endTime, parameters);

            if (dataPoints.isEmpty()) {
                document.add(new Paragraph("No data available for the specified period."));
            } else {
                // Create table
                int columnCount = parameters.size() + 1; // +1 for timestamp column
                Table table = new Table(UnitValue.createPercentArray(columnCount)).useAllAvailableWidth();

                // Add header row
                Cell headerCell = new Cell().add(new Paragraph("Timestamp").setBold())
                        .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                        .setTextAlignment(TextAlignment.CENTER);
                table.addHeaderCell(headerCell);

                for (String param : parameters) {
                    String displayName = displayNames.getOrDefault(param, param);
                    headerCell = new Cell().add(new Paragraph(displayName).setBold())
                            .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                            .setTextAlignment(TextAlignment.CENTER);
                    table.addHeaderCell(headerCell);
                }

                // Add data rows
                for (HistoryDataPoint dataPoint : dataPoints) {
                    // Add timestamp
                    table.addCell(new Cell().add(new Paragraph(dataPoint.getTimestamp().format(DATE_FORMATTER)))
                            .setTextAlignment(TextAlignment.CENTER));

                    // Add parameter values
                    for (String param : parameters) {
                        Object value = dataPoint.getParameters().get(param);
                        String displayValue = formatValue(value);
                        table.addCell(new Cell().add(new Paragraph(displayValue))
                                .setTextAlignment(TextAlignment.CENTER));
                    }
                }

                document.add(table);
            }

            // Add footer
            document.add(new Paragraph("\n"));
            document.add(new Paragraph("Generated on: " + LocalDateTime.now().format(DATE_FORMATTER))
                    .setFontSize(10)
                    .setTextAlignment(TextAlignment.RIGHT));

            document.close();
            logger.info("PDF report generated for device: {} with {} data points", deviceId, dataPoints.size());

            return baos.toByteArray();
        } catch (Exception e) {
            logger.error("Error generating PDF report: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to generate PDF report", e);
        }
    }

    /**
     * Format value for display
     */
    private String formatValue(Object value) {
        if (value == null) {
            return "-";
        }
        if (value instanceof Double) {
            return String.format("%.2f", (Double) value);
        }
        if (value instanceof Boolean) {
            return (Boolean) value ? "YES" : "NO";
        }
        return value.toString();
    }
}
