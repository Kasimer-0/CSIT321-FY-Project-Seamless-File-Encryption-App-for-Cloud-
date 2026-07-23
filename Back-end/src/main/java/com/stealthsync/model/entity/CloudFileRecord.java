package com.stealthsync.model.entity;

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
        name = "cloud_file_records",
        uniqueConstraints = @UniqueConstraint(columnNames = {"owner_id", "provider", "remote_file_id"})
)
/** Owner-scoped index for browser-encrypted V2 objects; it never stores plaintext file metadata. */
public class CloudFileRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cloud_file_record_id")
    private Long cloudFileRecordID;

    @Column(name = "owner_id", nullable = false)
    private Long ownerID;

    @Column(nullable = false, length = 32)
    private String provider;

    @Column(name = "remote_file_id", nullable = false, length = 1024)
    private String remoteFileID;

    @Column(name = "object_name", nullable = false, length = 128)
    private String objectName;

    @Column(nullable = false, length = 32)
    private String algorithm;

    @Column(name = "key_fingerprint", nullable = false, length = 32)
    private String keyFingerprint;

    @Column(name = "encrypted_metadata", nullable = false, length = 16384)
    private String encryptedMetadata;

    @Column(name = "envelope_version", nullable = false)
    private int envelopeVersion;

    @Column(name = "plaintext_size", nullable = false)
    private long plaintextSize;

    @Column(name = "ciphertext_size", nullable = false)
    private long ciphertextSize;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
