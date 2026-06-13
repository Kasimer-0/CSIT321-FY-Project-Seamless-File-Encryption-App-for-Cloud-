package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** API representation of a subscription plan. */
public class PlanDTO {
    private String planID;
    private String planTitle;
    private double planPrice;
    private String planDescription;
    private String planStatus; // "active" or "suspended"
    private String encMethod;  //Encryption algorithms, such as "AES-256-GCM"
}
