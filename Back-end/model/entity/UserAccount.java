package com.stealthsync.model.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoSize;

@Data
@AllArgsConstructor
public class UserAccount {
    private Long id;              // Align the id: number in Entity.ts
    private String username;
    private String email;
    private String role;          // "admin" | "customer"
    private boolean isPremium;
    private boolean isSuspended;
}