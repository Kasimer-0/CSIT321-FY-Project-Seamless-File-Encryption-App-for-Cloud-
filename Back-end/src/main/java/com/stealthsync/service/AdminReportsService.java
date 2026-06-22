package com.stealthsync.service;

import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.service.ai.AnomalyDetectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
/** Builds report data and CSV exports independently from HTTP concerns. */
public class AdminReportsService {

    private final UserAccountRepository userAccountRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final PlanRepository planRepository;
    private final EncryptedFileRecordRepository encryptedFileRecordRepository;
    private final CloudStorageLinkRepository cloudStorageLinkRepository;
    private final SystemLogRepository systemLogRepository;
    private final AnomalyDetectorService anomalyDetectorService;

    public Map<String, Object> performanceReport() {
        long totalUsers = userAccountRepository.count();
        long premiumUsers = userAccountRepository.findAll().stream().filter(UserAccount::isSubscribed).count();
        long encryptedFiles = encryptedFileRecordRepository.count();
        long cloudLinks = cloudStorageLinkRepository.count();
        long activeCloudLinks = cloudStorageLinkRepository.findAll().stream().filter(link -> link.isActive()).count();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("generatedAt", Instant.now().toString());
        report.put("totalUsers", totalUsers);
        report.put("premiumUsers", premiumUsers);
        report.put("encryptedFiles", encryptedFiles);
        report.put("cloudLinks", cloudLinks);
        report.put("activeCloudLinks", activeCloudLinks);
        return report;
    }

    public Map<String, Object> financialReport() {
        List<Subscription> activeSubscriptions = subscriptionRepository.findAll().stream()
                .filter(subscription -> "active".equalsIgnoreCase(subscription.getSubcriptionStatus()))
                .toList();
        double monthlyRevenue = activeSubscriptions.stream()
                .mapToDouble(subscription -> subscription.getPlan().getPlanPrice())
                .sum();
        long paidPlanCount = planRepository.findAll().stream().filter(plan -> plan.getPlanPrice() > 0).count();

        Map<String, Object> report = new LinkedHashMap<>();
        report.put("generatedAt", Instant.now().toString());
        report.put("activeSubscriptions", activeSubscriptions.size());
        report.put("monthlyRevenue", monthlyRevenue);
        report.put("paidPlanCount", paidPlanCount);
        report.put("averageRevenuePerSubscription",
                activeSubscriptions.isEmpty() ? 0 : monthlyRevenue / activeSubscriptions.size());
        report.put("planRevenue", revenueByPlan(activeSubscriptions));
        return report;
    }

    public String performanceCsv() {
        return reportCsv(performanceReport());
    }

    public String financialCsv() {
        Map<String, Object> report = financialReport();
        StringBuilder csv = new StringBuilder(reportCsv(report));
        csv.append('\n').append("Plan,Subscriber Count,Monthly Revenue").append('\n');
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> planRevenue = (List<Map<String, Object>>) report.get("planRevenue");
        planRevenue.forEach(row -> csv.append(escape(String.valueOf(row.get("planTitle")))).append(',')
                .append(row.get("subscriberCount")).append(',')
                .append(row.get("monthlyRevenue")).append('\n'));
        return csv.toString();
    }

    public List<SystemLog> logs() {
        return systemLogRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"));
    }

    public List<SystemLog> flaggedLogs() {
        return logs().stream().filter(anomalyDetectorService::isSuspicious).toList();
    }

    public String logsCsv() {
        StringBuilder csv = new StringBuilder("Log ID,Username,Action,IP Address,Timestamp,Suspicious,Risk Reason\n");
        logs().forEach(log -> csv.append(log.getLogId()).append(',')
                .append(escape(log.getUsername())).append(',')
                .append(escape(log.getAction())).append(',')
                .append(escape(log.getIpAddress())).append(',')
                .append(log.getTimestamp()).append(',')
                .append(log.isSuspicious()).append(',')
                .append(escape(log.getAiRiskReason())).append('\n'));
        return csv.toString();
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

    private String reportCsv(Map<String, Object> report) {
        StringBuilder csv = new StringBuilder("Metric,Value\n");
        report.forEach((key, value) -> {
            if (!(value instanceof List<?>)) {
                csv.append(escape(key)).append(',').append(escape(String.valueOf(value))).append('\n');
            }
        });
        return csv.toString();
    }

    private String escape(String value) {
        String normalized = value == null ? "" : value.replace("\"", "\"\"");
        if (normalized.contains(",") || normalized.contains("\n") || normalized.contains("\"")) {
            return "\"" + normalized + "\"";
        }
        return normalized.toLowerCase(Locale.ROOT).equals("null") ? "" : normalized;
    }
}