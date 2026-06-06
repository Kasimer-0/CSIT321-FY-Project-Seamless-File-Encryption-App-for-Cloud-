package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CloudStorageLink {
    private Long linkID;
    private String provider;
    private String accountEmail;
    private Instant linkedAt;
    private String status;
    private boolean active;
    private Long ownerID;

    @JsonProperty("isActive")
    public boolean isActive() {
        return active;
    }

    @JsonProperty("isActive")
    public void setActive(boolean active) {
        this.active = active;
    }
}
