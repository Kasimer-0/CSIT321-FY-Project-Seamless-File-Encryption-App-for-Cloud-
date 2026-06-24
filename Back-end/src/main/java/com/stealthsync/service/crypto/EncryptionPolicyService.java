package com.stealthsync.service.crypto;

import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
/** Resolves the enforced encryption method for each customer from their active plan/subscription state. */
public class EncryptionPolicyService {

    private static final String AES_128 = "AES-128";
    private static final String AES_256_GCM = "AES-256-GCM";

    private final UserAccountRepository userAccountRepository;
    private final SubscriptionRepository subscriptionRepository;

    public EncryptionPolicy policyForUser(Long ownerID) {
        UserAccount user = userAccountRepository.findById(ownerID)
                .orElseThrow(() -> new IllegalArgumentException("User not found."));
        if (!user.isSubscribed()) {
            return policyForAlgorithm(AES_128);
        }
        return subscriptionRepository.findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(ownerID)
                .filter(this::isActive)
                .map(subscription -> policyForAlgorithm(subscription.getPlan().getEncMethod()))
                .orElseGet(() -> policyForAlgorithm(AES_128));
    }

    public EncryptionPolicy policyForAlgorithm(String encMethod) {
        String normalized = normalize(encMethod);
        if (AES_128.equals(normalized)) {
            return new EncryptionPolicy(AES_128, 128);
        }
        if (AES_256_GCM.equals(normalized)) {
            return new EncryptionPolicy(AES_256_GCM, 256);
        }
        throw new IllegalArgumentException("Unsupported encryption method: " + encMethod);
    }

    public List<String> supportedPlanMethods() {
        return List.of(AES_128, AES_256_GCM);
    }

    private boolean isActive(Subscription subscription) {
        return subscription != null && "active".equalsIgnoreCase(subscription.getSubcriptionStatus());
    }

    private String normalize(String encMethod) {
        if (encMethod == null || encMethod.isBlank()) {
            return AES_128;
        }
        String value = encMethod.trim().toUpperCase(Locale.ROOT);
        if ("AES-128-GCM".equals(value)) {
            return AES_128;
        }
        return value;
    }

    public record EncryptionPolicy(String algorithm, int keyLengthBits) {
    }
}
