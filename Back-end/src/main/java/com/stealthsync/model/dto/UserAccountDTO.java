package com.stealthsync.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UserAccountDTO {
    private Long id; // The front end uses user.id to render the list.
    private String username;
    private String email;
    private String role;
    @JsonProperty("isPremium")
    private boolean premium;
    @JsonProperty("isSuspended")
    private boolean suspended;
}
