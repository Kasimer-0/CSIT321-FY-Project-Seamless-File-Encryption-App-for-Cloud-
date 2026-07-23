package com.stealthsync.repository;

import com.stealthsync.model.entity.CloudFileRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Owner-scoped lookups prevent a remote file ID from becoming an authorization shortcut. */
public interface CloudFileRecordRepository extends JpaRepository<CloudFileRecord, Long> {
    Optional<CloudFileRecord> findByOwnerIDAndProviderIgnoreCaseAndRemoteFileID(
            Long ownerID, String provider, String remoteFileID);

    List<CloudFileRecord> findByOwnerIDAndProviderIgnoreCaseOrderByCreatedAtDesc(Long ownerID, String provider);

    void deleteByOwnerID(Long ownerID);
}
