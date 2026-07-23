package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
        name = "user_devices",
        uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "device_identifier_hash"})
)
/** Owner-scoped device registration; only a one-way identifier hash is persisted. */
public class UserDevice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "device_id")
    private Long deviceID;

    @Column(name = "owner_id", nullable = false)
    private Long ownerID;

    @JsonIgnore
    @Column(name = "device_identifier_hash", nullable = false, length = 64)
    private String deviceIdentifierHash;

    @Column(name = "device_name", nullable = false, length = 120)
    private String deviceName;

    @Column(nullable = false, length = 80)
    private String platform;

    @Column(name = "first_seen_at", nullable = false)
    private Instant firstSeenAt;

    @Column(name = "last_seen_at", nullable = false)
    private Instant lastSeenAt;

    @Column(name = "is_primary", nullable = false)
    private boolean primaryDevice;

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "revoked_at")
    private Instant revokedAt;
}
