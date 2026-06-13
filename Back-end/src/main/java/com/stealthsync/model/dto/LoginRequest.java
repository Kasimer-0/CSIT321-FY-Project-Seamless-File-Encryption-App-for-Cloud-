package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** Password-login credentials accepted as either username or email. */
public class LoginRequest {
    private String usernameOrEmail; // usernameOrEmail for front-end integration
    private String password;        // password for front-end integration
}
