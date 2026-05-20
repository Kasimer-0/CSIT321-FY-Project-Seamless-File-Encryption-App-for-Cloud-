package com.stealthsync.model.dto;

import lombok.Data;

@Data
public class UserAccountDTO {
    private String id; // The front end uses user.id to render the list.
    private String username;
    private String email;
    private String role;
    private boolean isPremium;
    private boolean isSuspended;
}