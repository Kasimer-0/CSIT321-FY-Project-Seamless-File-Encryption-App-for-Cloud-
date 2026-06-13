package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "cloud_storage_links")
/** Persisted link between one customer and a supported cloud provider account. */
public class CloudStorageLink {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "link_id")
    private Long linkID;

    @Column(nullable = false)
    private String provider;

    @Column(nullable = false)
    private String accountEmail;

    @Column(nullable = false)
    private Instant linkedAt;

    @Column(nullable = false)
    private String status;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "owner_id", nullable = false)
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
