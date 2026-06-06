package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserAccount {
    private Long userID;          // Align the userID: number in Type.ts
    private String username;
    private String email;
    private String role;          // "admin" | "customer"
    private boolean subscribed;
    private boolean suspended;
    private Long subscription;

    public UserAccount(Long userID, String username, String email, String role, boolean subscribed, boolean suspended) {
        this(userID, username, email, role, subscribed, suspended, null);
    }

    public Long getId() {
        return userID;
    }

    public void setId(Long id) {
        this.userID = id;
    }

    @JsonProperty("isSubscribed")
    public boolean isSubscribed() {
        return subscribed;
    }

    @JsonProperty("isSubscribed")
    public void setSubscribed(boolean subscribed) {
        this.subscribed = subscribed;
    }

    @JsonProperty("isSuspended")
    public boolean isSuspended() {
        return suspended;
    }

    @JsonProperty("isSuspended")
    public void setSuspended(boolean suspended) {
        this.suspended = suspended;
    }
}
