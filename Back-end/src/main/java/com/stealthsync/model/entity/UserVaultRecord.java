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
@Table(name = "user_vaults", uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_vault_owner", columnNames = "owner_id")
})
/** Stores one wrapped per-user file key so file encryption is not based on a shared demo passphrase. */
public class UserVaultRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "vault_id")
    private Long vaultID;

    @Column(name = "owner_id", nullable = false)
    private Long ownerID;

    @Column(name = "vault_salt", nullable = false)
    private String vaultSalt;

    @Column(name = "wrapped_file_key", nullable = false, length = 2048)
    private String wrappedFileKey;

    @Column(name = "key_scheme", nullable = false)
    private String keyScheme;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;
}
