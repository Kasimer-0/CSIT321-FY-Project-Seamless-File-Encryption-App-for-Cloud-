package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** Demo purchase request identifying the customer and selected plan. */
public class PurchasePlanRequest {
    private Long userID;
    private Long planID;
}
