package com.stealthsync.model.dto;

import lombok.Data;

@Data
public class SignUpRequest {
    private String username;
    private String email;
    private String password;
    private String dob; // The front end is passing in a date string (YYYY-MM-DD).
}
