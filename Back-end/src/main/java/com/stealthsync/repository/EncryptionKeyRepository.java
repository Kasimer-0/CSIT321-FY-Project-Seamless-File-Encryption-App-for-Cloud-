package com.stealthsync.repository;

import com.stealthsync.model.entity.EncryptionKeyRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EncryptionKeyRepository extends JpaRepository<EncryptionKeyRecord, Long> {
    List<EncryptionKeyRecord> findByOwnerIDOrderByCreatedAtDesc(Long ownerID);

    Optional<EncryptionKeyRecord> findByKeyIDAndOwnerID(Long keyID, Long ownerID);

    void deleteByOwnerID(Long ownerID);
}
