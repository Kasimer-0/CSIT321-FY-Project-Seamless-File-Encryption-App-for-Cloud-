package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAccount {
    private Long id;              // Align the id: number in Entity.ts
    private String username;
    private String email;
    private String role;          // "admin" | "customer"
    @JsonProperty("isPremium")
    private boolean premium;
    @JsonProperty("isSuspended")
    private boolean suspended;
}
