package com.stealthsync.repository;

import com.stealthsync.model.entity.GoogleDriveCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Compatibility access for existing encrypted Google credentials pending an explicit database migration. */
public interface GoogleDriveCredentialRepository extends JpaRepository<GoogleDriveCredential, Long> {
    Optional<GoogleDriveCredential> findByOwnerID(Long ownerID);

    @Transactional
    void deleteByOwnerID(Long ownerID);
}
