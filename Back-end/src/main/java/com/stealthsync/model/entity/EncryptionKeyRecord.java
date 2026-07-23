package com.stealthsync.model.entity;

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
@Table(name = "encryption_keys")
/** Customer-owned password-protected key metadata; plaintext passwords and derived key bytes are never serialized. */
public class EncryptionKeyRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "key_id")
    private Long keyID;

    @Column(nullable = false)
    private Long ownerID;

    @Column(nullable = false)
    private String keyName;

    @Column(nullable = false)
    private String algorithm;

    @Column(nullable = false)
    private String status;

    @Column(nullable = false)
    private String fingerprint;

    @Column(length = 128)
    private String salt;

    @Column(length = 128)
    private String passwordVerifier;

    @Column(length = 80)
    private String keyScheme;

    @Column(name = "kdf_iterations")
    private Integer kdfIterations;

    @Column(name = "kdf_version")
    private Integer kdfVersion;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;
}
