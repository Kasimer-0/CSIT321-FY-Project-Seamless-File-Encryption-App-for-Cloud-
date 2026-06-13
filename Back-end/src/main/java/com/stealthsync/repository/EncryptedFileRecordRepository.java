package com.stealthsync.repository;

import com.stealthsync.model.entity.EncryptedFileRecord;
import org.springframework.data.jpa.repository.JpaRepository;

/** Database access for locally stored encrypted-file records. */
public interface EncryptedFileRecordRepository extends JpaRepository<EncryptedFileRecord, Long> {
}
