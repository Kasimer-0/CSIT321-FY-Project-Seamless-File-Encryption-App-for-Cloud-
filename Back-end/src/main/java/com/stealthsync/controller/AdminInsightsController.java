package com.stealthsync.controller;

import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.service.AdminReportsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
/** Exposes administrator-only reports, CSV downloads, and security logs. */
public class AdminInsightsController {

    private final AdminReportsService reportsService;

    @GetMapping("/reports/performance")
    public ResponseEntity<Map<String, Object>> performanceReport() {
        return ResponseEntity.ok(reportsService.performanceReport());
    }

    @GetMapping("/reports/financial")
    public ResponseEntity<Map<String, Object>> financialReport() {
        return ResponseEntity.ok(reportsService.financialReport());
    }

    @GetMapping("/reports/performance/download")
    public ResponseEntity<String> downloadPerformanceReport() {
        return csv("performance-report.csv", reportsService.performanceCsv());
    }

    @GetMapping("/reports/financial/download")
    public ResponseEntity<String> downloadFinancialReport() {
        return csv("financial-report.csv", reportsService.financialCsv());
    }

    @GetMapping("/logs")
    public ResponseEntity<List<SystemLog>> logs() {
        return ResponseEntity.ok(reportsService.logs());
    }

    @GetMapping("/logs/flagged")
    public ResponseEntity<List<SystemLog>> flaggedLogs() {
        return ResponseEntity.ok(reportsService.flaggedLogs());
    }

    @GetMapping("/logs/download")
    public ResponseEntity<String> downloadLogs() {
        return csv("system-logs.csv", reportsService.logsCsv());
    }

    private ResponseEntity<String> csv(String filename, String content) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(filename, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(content);
    }
}