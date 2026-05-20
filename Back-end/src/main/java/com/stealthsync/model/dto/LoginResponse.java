package com.stealthsync.model.dto;

import com.stealthsync.model.entity.UserAccount;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private UserAccount user; // Core: Precisely connect to the frontend data.user
}
