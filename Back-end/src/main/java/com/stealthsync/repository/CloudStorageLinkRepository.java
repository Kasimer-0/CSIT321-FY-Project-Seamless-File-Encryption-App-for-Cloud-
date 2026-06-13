package com.stealthsync.repository;

import com.stealthsync.model.entity.CloudStorageLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Database access and owner/provider lookups for cloud account links. */
public interface CloudStorageLinkRepository extends JpaRepository<CloudStorageLink, Long> {
    Optional<CloudStorageLink> findByProviderIgnoreCase(String provider);

    List<CloudStorageLink> findByOwnerID(Long ownerID);

    Optional<CloudStorageLink> findByOwnerIDAndProviderIgnoreCase(Long ownerID, String provider);

    void deleteByOwnerID(Long ownerID);
}
