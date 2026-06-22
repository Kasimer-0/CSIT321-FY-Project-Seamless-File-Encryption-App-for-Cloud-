package com.stealthsync.model.dto;

import com.stealthsync.model.entity.UserAccount;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
/** Login result containing the account and signed Bearer token. */
public class LoginResponse {
    private UserAccount user;
    private String token;
}