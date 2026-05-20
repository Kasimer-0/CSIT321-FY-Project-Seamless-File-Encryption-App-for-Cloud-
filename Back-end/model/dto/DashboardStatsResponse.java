package com.stealthsync.model.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardStatsResponse {
    private int totalUsers;
    private int premiumUsers;
    private int inactiveUsers;
    private int openTickets;
}