package com.stealthsync.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.stealthsync.model.entity.Subscription;
import lombok.Data;

@Data
/** Public account representation that omits password and recovery-phrase hashes. */
public class UserAccountDTO {
    private Long userID;
    private String username;
    private String email;
    private String role;
    private boolean subscribed;
    private boolean suspended;
    private Subscription subscription;

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
