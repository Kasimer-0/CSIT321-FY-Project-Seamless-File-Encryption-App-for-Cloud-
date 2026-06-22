package com.stealthsync.repository;

import com.stealthsync.model.entity.EncryptedFileRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Owner-scoped database access for locally stored encrypted-file records. */
public interface EncryptedFileRecordRepository extends JpaRepository<EncryptedFileRecord, Long> {
    List<EncryptedFileRecord> findByOwnerIDOrderByUploadedAtDesc(Long ownerID);

    Optional<EncryptedFileRecord> findByFileIDAndOwnerID(Long fileID, Long ownerID);
}