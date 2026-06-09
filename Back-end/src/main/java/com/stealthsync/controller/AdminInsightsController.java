package com.stealthsync.controller;

import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.TicketRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.service.ai.AnomalyDetectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/admin")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
public class AdminInsightsController {

    private final UserAccountRepository userAccountRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;
    private final TicketRepository ticketRepository;
    private final EncryptedFileRecordRepository encryptedFileRecordRepository;
    private final CloudStorageLinkRepository cloudStorageLinkRepository;
    private final SystemLogRepository systemLogRepository;
    private final AnomalyDetectorService anomalyDetectorService;

    @GetMapping("/reports/performance")
    public ResponseEntity<Map<String, Object>> performanceReport() {
        long totalUsers = userAccountRepository.count();
        long premiumUsers = userAccountRepository.findAll().stream().filter(UserAccount::isSubscribed).count();
        long openTickets = ticketRepository.findAll().stream()
                .filter(ticket -> "open".equalsIgnoreCase(ticket.getTicketStatus()))
                .count();
        long encryptedFiles = encryptedFileRecordRepository.count();
        long cloudLinks = cloudStorageLinkRepository.count();
        long activeCloudLinks = cloudStorageLinkRepository.findAll().stream().filter(link -> link.isActive()).count();
        return ResponseEntity.ok(Map.of(
                "generatedAt", Instant.now().toString(),
                "totalUsers", totalUsers,
                "premiumUsers", premiumUsers,
                "openTickets", openTickets,
                "encryptedFiles", encryptedFiles,
                "cloudLinks", cloudLinks,
                "activeCloudLinks", activeCloudLinks
        ));
    }

    @GetMapping("/reports/financial")
    public ResponseEntity<Map<String, Object>> financialReport() {
        List<Subscription> activeSubscriptions = subscriptionRepository.findAll().stream()
                .filter(subscription -> "active".equalsIgnoreCase(subscription.getSubcriptionStatus()))
                .toList();
        double monthlyRevenue = activeSubscriptions.stream()
                .mapToDouble(subscription -> subscription.getPlan().getPlanPrice())
                .sum();
        long paidPlanCount = planRepository.findAll().stream().filter(plan -> plan.getPlanPrice() > 0).count();
        return ResponseEntity.ok(Map.of(
                "generatedAt", Instant.now().toString(),
                "activeSubscriptions", activeSubscriptions.size(),
                "monthlyRevenue", monthlyRevenue,
                "paidPlanCount", paidPlanCount,
                "averageRevenuePerSubscription", activeSubscriptions.isEmpty() ? 0 : monthlyRevenue / activeSubscriptions.size(),
                "planRevenue", revenueByPlan(activeSubscriptions)
        ));
    }

    @GetMapping("/reports/performance/download")
    public ResponseEntity<String> downloadPerformanceReport() {
        Map<String, Object> report = performanceReport().getBody();
        return csv("performance-report.csv", "Metric,Value\n" + csvLines(report));
    }

    @GetMapping("/reports/financial/download")
    public ResponseEntity<String> downloadFinancialReport() {
        Map<String, Object> report = financialReport().getBody();
        return csv("financial-report.csv", "Metric,Value\n" + csvLines(report));
    }

    @GetMapping("/logs")
    public ResponseEntity<List<SystemLog>> logs() {
        return ResponseEntity.ok(systemLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp")));
    }

    @GetMapping("/logs/flagged")
    public ResponseEntity<List<SystemLog>> flaggedLogs() {
        List<SystemLog> flagged = systemLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp")).stream()
                .filter(anomalyDetectorService::isSuspicious)
                .toList();
        return ResponseEntity.ok(flagged);
    }

    @GetMapping("/logs/download")
    public ResponseEntity<String> downloadLogs() {
        StringBuilder csv = new StringBuilder("Log ID,Username,Action,IP Address,Timestamp,Suspicious,Risk Reason\n");
        systemLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"))
                .forEach(log -> csv.append(log.getLogId()).append(',')
                        .append(escape(log.getUsername())).append(',')
                        .append(escape(log.getAction())).append(',')
                        .append(escape(log.getIpAddress())).append(',')
                        .append(log.getTimestamp()).append(',')
                        .append(log.isSuspicious()).append(',')
                        .append(escape(log.getAiRiskReason())).append('\n'));
        return csv("system-logs.csv", csv.toString());
    }

    private List<Map<String, Object>> revenueByPlan(List<Subscription> activeSubscriptions) {
        return planRepository.findAll(Sort.by("planID")).stream()
                .filter(plan -> plan.getPlanPrice() > 0)
                .map(plan -> planRevenue(plan, activeSubscriptions))
                .toList();
    }

    private Map<String, Object> planRevenue(Plan plan, List<Subscription> activeSubscriptions) {
        long count = activeSubscriptions.stream()
                .filter(subscription -> subscription.getPlan().getPlanID().equals(plan.getPlanID()))
                .count();
        return Map.of(
                "planTitle", plan.getPlanTitle(),
                "subscriberCount", count,
                "monthlyRevenue", count * plan.getPlanPrice()
        );
    }

    private String csvLines(Map<String, Object> report) {
        StringBuilder csv = new StringBuilder();
        report.forEach((key, value) -> {
            if (!(value instanceof List<?>)) {
                csv.append(key).append(',').append(escape(String.valueOf(value))).append('\n');
            }
        });
        return csv.toString();
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

    private String escape(String value) {
        String normalized = value == null ? "" : value.replace("\"", "\"\"");
        if (normalized.contains(",") || normalized.contains("\n") || normalized.contains("\"")) {
            return "\"" + normalized + "\"";
        }
        return normalized.toLowerCase(Locale.ROOT).contains("null") ? "" : normalized;
    }
}
