package com.stealthsync.model.dto;

import lombok.Data;

@Data
public class LoginRequest {
    private String usernameOrEmail; // usernameOrEmail for front-end integration
    private String password;        // password for front-end integration
}