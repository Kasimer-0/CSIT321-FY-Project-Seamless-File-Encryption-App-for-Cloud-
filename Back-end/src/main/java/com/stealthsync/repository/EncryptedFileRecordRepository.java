package com.stealthsync.repository;

import com.stealthsync.model.entity.EncryptedFileRecord;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EncryptedFileRecordRepository extends JpaRepository<EncryptedFileRecord, Long> {
}
