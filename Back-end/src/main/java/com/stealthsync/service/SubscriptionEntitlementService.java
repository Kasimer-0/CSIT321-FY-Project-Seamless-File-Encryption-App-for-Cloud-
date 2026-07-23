package com.stealthsync.service;

import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.SubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
/** Resolves paid-plan entitlements from status, dates, plan price, and account state. */
public class SubscriptionEntitlementService {

    private final SubscriptionRepository subscriptionRepository;

    public boolean hasActivePremium(UserAccount user) {
        return user != null
                && user.isSubscribed()
                && subscriptionRepository.findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(user.getUserID())
                .filter(this::isActivePremium)
                .isPresent();
    }

    public boolean isActivePremium(Subscription subscription) {
        if (subscription == null
                || !"active".equalsIgnoreCase(subscription.getSubcriptionStatus())
                || subscription.getPlan() == null
                || subscription.getPlan().getPlanPrice() <= 0
                || !"active".equalsIgnoreCase(subscription.getPlan().getPlanStatus())) {
            return false;
        }
        LocalDate endDate = subscription.getSubscriptionEndDate();
        return endDate == null || !endDate.isBefore(LocalDate.now());
    }
}
