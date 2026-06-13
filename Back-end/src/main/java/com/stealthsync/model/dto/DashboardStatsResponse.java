package com.stealthsync.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
/** Summary counters displayed on the administrator overview dashboard. */
public class DashboardStatsResponse {
    private int totalUsers;
    private int premiumUsers;
    private int inactiveUsers;
    private int openTickets;
}
