package com.stealthsync.repository;

import com.stealthsync.model.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Database access for customer subscriptions and subscriber queries. */
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    Optional<Subscription> findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(Long userID);
}
