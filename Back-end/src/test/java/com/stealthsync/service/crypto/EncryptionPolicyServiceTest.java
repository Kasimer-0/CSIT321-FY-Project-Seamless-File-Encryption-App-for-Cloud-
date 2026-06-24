package com.stealthsync.service.crypto;

import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EncryptionPolicyServiceTest {

    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final EncryptionPolicyService service = new EncryptionPolicyService(userAccountRepository, subscriptionRepository);

    @Test
    void freeCustomerUsesAes128() {
        UserAccount customer = new UserAccount(2L, "free", "free@example.com", "customer", false, false, null);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(customer));

        EncryptionPolicyService.EncryptionPolicy policy = service.policyForUser(2L);

        assertEquals("AES-128", policy.algorithm());
        assertEquals(128, policy.keyLengthBits());
    }

    @Test
    void premiumCustomerUsesPlanAes256() {
        UserAccount customer = new UserAccount(3L, "premium", "premium@example.com", "customer", true, false, 9L);
        Plan premiumPlan = new Plan(4L, "Premium", 15.0, "Description", "active", "AES-256-GCM");
        Subscription subscription = new Subscription(
                9L,
                premiumPlan,
                customer,
                "active",
                LocalDate.now().minusDays(1),
                LocalDate.now().plusDays(29)
        );
        when(userAccountRepository.findById(3L)).thenReturn(Optional.of(customer));
        when(subscriptionRepository.findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(3L))
                .thenReturn(Optional.of(subscription));

        EncryptionPolicyService.EncryptionPolicy policy = service.policyForUser(3L);

        assertEquals("AES-256-GCM", policy.algorithm());
        assertEquals(256, policy.keyLengthBits());
    }

    @Test
    void rejectsUnimplementedAlgorithms() {
        assertThrows(IllegalArgumentException.class, () -> service.policyForAlgorithm("ChaCha20"));
    }
}