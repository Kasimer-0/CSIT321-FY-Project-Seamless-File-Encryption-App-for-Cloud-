package com.stealthsync.model.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Plan {
    private Long planID;          //Align the planID: number in Entity.ts
    private String planTitle;
    private double planPrice;     // Align the planPrice: number in Entity.ts
    private String planDescription;
    private String planStatus;
    private String encMethod;
}
