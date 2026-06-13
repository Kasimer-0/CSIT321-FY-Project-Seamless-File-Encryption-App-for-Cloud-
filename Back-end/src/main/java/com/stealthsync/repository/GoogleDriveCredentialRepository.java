package com.stealthsync.repository;

import com.stealthsync.model.entity.GoogleDriveCredential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Database access for one encrypted Google Drive credential record per customer. */
public interface GoogleDriveCredentialRepository extends JpaRepository<GoogleDriveCredential, Long> {
    Optional<GoogleDriveCredential> findByOwnerID(Long ownerID);

    void deleteByOwnerID(Long ownerID);
}
