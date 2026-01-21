package com.generator.monitoring.service;

import com.generator.monitoring.dto.HistoryDataPoint;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.geom.PageSize;
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

            // Use landscape orientation for better column visibility
            int columnCount = parameters.size() + 1; // +1 for timestamp column
            PageSize pageSize = columnCount > 6 ? PageSize.A4.rotate() : PageSize.A4;
            pdf.setDefaultPageSize(pageSize);

            Document document = new Document(pdf);
            document.setMargins(20, 20, 20, 20);

            // Add title
            Paragraph title = new Paragraph("Generator Monitoring Report")
                    .setFontSize(16)
                    .setBold()
                    .setTextAlignment(TextAlignment.CENTER);
            document.add(title);

            // Add device info and time range
            document.add(new Paragraph("Device ID: " + deviceId).setFontSize(9));
            document.add(new Paragraph("Report Period: " + startTime.format(DATE_FORMATTER) +
                    " to " + endTime.format(DATE_FORMATTER)).setFontSize(9));
            document.add(new Paragraph("\n").setFontSize(6));

            // Get parameter display names
            Map<String, String> displayNames = historyService.getParameterDisplayNames();

            // Query historical data
            List<HistoryDataPoint> dataPoints = historyService.queryHistory(deviceId, startTime, endTime, parameters);

            if (dataPoints.isEmpty()) {
                document.add(new Paragraph("No data available for the specified period.").setFontSize(10));
            } else {
                // Determine font size based on number of columns
                int headerFontSize = columnCount > 10 ? 6 : (columnCount > 6 ? 7 : 8);
                int cellFontSize = columnCount > 10 ? 5 : (columnCount > 6 ? 6 : 7);

                // Create table with equal column widths
                Table table = new Table(UnitValue.createPercentArray(columnCount)).useAllAvailableWidth();
                table.setFontSize(cellFontSize);

                // Add header row - Timestamp column
                Cell headerCell = new Cell()
                        .add(new Paragraph("Timestamp").setFontSize(headerFontSize).setBold())
                        .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                        .setTextAlignment(TextAlignment.CENTER)
                        .setPadding(3);
                table.addHeaderCell(headerCell);

                // Add header row - Parameter columns
                for (String param : parameters) {
                    String displayName = displayNames.getOrDefault(param, param);
                    // Wrap long header text
                    Paragraph headerParagraph = new Paragraph(displayName)
                            .setFontSize(headerFontSize)
                            .setBold();

                    headerCell = new Cell()
                            .add(headerParagraph)
                            .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                            .setTextAlignment(TextAlignment.CENTER)
                            .setPadding(3);
                    table.addHeaderCell(headerCell);
                }

                // Add data rows
                for (HistoryDataPoint dataPoint : dataPoints) {
                    // Add timestamp cell
                    String timestamp = dataPoint.getTimestamp().format(DATE_FORMATTER);
                    Cell timestampCell = new Cell()
                            .add(new Paragraph(timestamp).setFontSize(cellFontSize))
                            .setTextAlignment(TextAlignment.CENTER)
                            .setPadding(2);
                    table.addCell(timestampCell);

                    // Add parameter value cells
                    for (String param : parameters) {
                        Object value = dataPoint.getParameters().get(param);
                        String displayValue = formatValue(value);
                        Cell valueCell = new Cell()
                                .add(new Paragraph(displayValue).setFontSize(cellFontSize))
                                .setTextAlignment(TextAlignment.CENTER)
                                .setPadding(2);
                        table.addCell(valueCell);
                    }
                }

                document.add(table);
            }

            // Add footer
            document.add(new Paragraph("\n").setFontSize(6));
            document.add(new Paragraph("Generated on: " + LocalDateTime.now().format(DATE_FORMATTER))
                    .setFontSize(8)
                    .setTextAlignment(TextAlignment.RIGHT));

            document.close();
            logger.info("PDF report generated for device: {} with {} data points and {} columns",
                    deviceId, dataPoints.size(), columnCount);

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
