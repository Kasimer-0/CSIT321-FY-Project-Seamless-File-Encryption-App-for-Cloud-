package com.stealthsync.model.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
/** Summary counters and graph data displayed on the administrator overview dashboard. */
public class DashboardStatsResponse {
    private int totalUsers;
    private int premiumUsers;
    private int inactiveUsers;
    private int flaggedLogsCount;
    private List<MonthlyRevenue> revenueStream;

    /** One month of revenue graph data returned by the backend, not hard-coded by the UI. */
    public record MonthlyRevenue(String month, double revenue) {
    }
}