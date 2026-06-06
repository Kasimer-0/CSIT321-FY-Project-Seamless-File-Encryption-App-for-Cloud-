package com.stealthsync.model.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EncryptedFileRecord {
    private Long fileID;
    private String fileName;
    private long fileSize;
    private String fileType;
    private Instant uploadedAt;
    private String encMethod;
    private Long keyID;
    @JsonIgnore
    private byte[] encryptedContent;
}
