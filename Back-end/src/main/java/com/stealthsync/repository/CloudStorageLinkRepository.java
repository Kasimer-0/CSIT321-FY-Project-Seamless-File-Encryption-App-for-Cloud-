package com.stealthsync.repository;

import com.stealthsync.model.entity.CloudStorageLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CloudStorageLinkRepository extends JpaRepository<CloudStorageLink, Long> {
    Optional<CloudStorageLink> findByProviderIgnoreCase(String provider);
}
