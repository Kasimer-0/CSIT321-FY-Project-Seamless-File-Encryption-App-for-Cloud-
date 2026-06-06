package com.stealthsync.model.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Subscription {
    private Long subscriptionID;
    private Plan plan;
    private UserAccount subscriber;
    private String subcriptionStatus;
    private LocalDate subcriptionStartDate;
    private LocalDate subscriptionEndDate;
}
