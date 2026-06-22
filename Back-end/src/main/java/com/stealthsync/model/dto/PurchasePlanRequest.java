package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** Selects a plan for the customer identified by the authenticated JWT. */
public class PurchasePlanRequest {
    private Long planID;
}