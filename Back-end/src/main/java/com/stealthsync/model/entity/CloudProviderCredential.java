package com.stealthsync.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(
        name = "cloud_provider_credentials",
        uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "owner_id"})
)
/**
 * Encrypted OAuth credential storage shared by Dropbox and OneDrive.
 * Google Drive keeps its established table until those live refresh tokens receive an explicit data migration.
 */
public class CloudProviderCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "credential_id")
    private Long credentialID;

    @Column(nullable = false, length = 64)
    private String provider;

    @Column(name = "owner_id", nullable = false)
    private Long ownerID;

    @Column(name = "account_email", nullable = false)
    private String accountEmail;

    @Column(name = "access_token", nullable = false, length = 4096)
    private String accessToken;

    @Column(name = "refresh_token", length = 4096)
    private String refreshToken;

    @Column(name = "token_salt", nullable = false, length = 64)
    private String tokenSalt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
