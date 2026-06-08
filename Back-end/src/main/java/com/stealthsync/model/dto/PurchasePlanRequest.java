package com.stealthsync.model.dto;

import lombok.Data;

@Data
public class PurchasePlanRequest {
    private Long userID;
    private Long planID;
}
