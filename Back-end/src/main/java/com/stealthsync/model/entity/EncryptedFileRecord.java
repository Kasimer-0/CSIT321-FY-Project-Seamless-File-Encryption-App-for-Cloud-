package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
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
@Table(name = "encrypted_files")
/** Metadata and encrypted bytes for files stored by the local demonstration repository. */
public class EncryptedFileRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long fileID;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private String fileType;

    @Column(nullable = false)
    private Instant uploadedAt;

    @Column(nullable = false)
    private String encMethod;

    @Column(name = "key_id", nullable = false)
    private Long keyID;

    @JsonIgnore
    @Column(name = "encrypted_content", columnDefinition = "bytea")
    private byte[] encryptedContent;
}
