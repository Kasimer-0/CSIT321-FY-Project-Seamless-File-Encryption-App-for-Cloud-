package com.stealthsync.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@Entity
@Table(name = "google_drive_credentials")
public class GoogleDriveCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "credential_id")
    private Long credentialID;

    @Column(name = "owner_id", nullable = false, unique = true)
    private Long ownerID;

    @Column(name = "account_email", nullable = false)
    private String accountEmail;

    @Column(name = "access_token", nullable = false, length = 4096)
    private String accessToken;

    @Column(name = "refresh_token", nullable = false, length = 4096)
    private String refreshToken;

    @Column(name = "token_salt", nullable = false, length = 64)
    private String tokenSalt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}
