package com.stealthsync.config;

import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;

@Component
@RequiredArgsConstructor
/**
 * Creates deterministic demo plans and test accounts at startup.
 * Lookups are idempotent so repeated launches do not duplicate seeded business data.
 */
public class DataSeeder implements CommandLineRunner {

    private static final double PREMIUM_PLAN_PRICE = 7.0;
    private static final double LEGACY_PREMIUM_PLAN_PRICE = 15.0;

    private final UserAccountRepository userAccountRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CloudStorageLinkRepository cloudStorageLinkRepository;
    private final EncryptedFileRecordRepository encryptedFileRecordRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        // Plans and users are seeded first because subscriptions reference them.
        planRepository.findByPlanTitleIgnoreCase("Basic Free Tier")
                .orElseGet(() -> planRepository.save(new Plan(
                        null,
                        "Basic Free Tier",
                        0.0,
                        "AES-128 Client-side Silent Encryption",
                        "active",
                        "AES-128"
                )));
        Plan premiumPlan = planRepository.findByPlanTitleIgnoreCase("Premium Corporate Tier")
                .orElseGet(() -> planRepository.save(new Plan(
                        null,
                        "Premium Corporate Tier",
                        PREMIUM_PLAN_PRICE,
                        "AES-256 GCM encryption with premium multi-device access",
                        "active",
                        "AES-256-GCM"
                )));
        // Migrate only the previous seeded price so later administrator-defined prices are preserved.
        if (Double.compare(premiumPlan.getPlanPrice(), LEGACY_PREMIUM_PLAN_PRICE) == 0) {
            premiumPlan.setPlanPrice(PREMIUM_PLAN_PRICE);
            planRepository.save(premiumPlan);
        }

        seedUser(
                "admin",
                "admin@stealthsync.com",
                "Admin@123",
                "admin",
                false,
                false
        );
        seedUser(
                "testuser",
                "testuser@stealthsync.com",
                "User@123",
                "customer",
                false,
                false
        );
        UserAccount customer = seedUser(
                "PremiumUser",
                "user@stealthsync.com",
                "User@1234",
                "customer",
                true,
                false
        );

        // Preserve an existing premium subscription; otherwise create the demo subscription state.
        Subscription subscription = subscriptionRepository.findAll().stream()
                .filter(existing -> existing.getSubscriber().getUserID().equals(customer.getUserID()))
                .findFirst()
                .orElseGet(() -> subscriptionRepository.save(new Subscription(
                        null,
                        premiumPlan,
                        customer,
                        "active",
                        LocalDate.now().minusDays(20),
                        LocalDate.now().plusDays(10)
                )));
        customer.setSubscribed("active".equalsIgnoreCase(subscription.getSubcriptionStatus()));
        customer.setSubscription(subscription.getSubscriptionID());
        userAccountRepository.save(customer);

        if (cloudStorageLinkRepository.count() == 0) {
            cloudStorageLinkRepository.save(new CloudStorageLink(
                    null,
                    "dropbox",
                    "premium.user@dropbox.example",
                    Instant.now().minusSeconds(86400 * 3),
                    "expired",
                    true,
                    customer.getUserID()
            ));
        }

        // Assign records created by older prototypes before owner isolation was introduced.
        encryptedFileRecordRepository.findAll().stream()
                .filter(record -> record.getOwnerID() == null)
                .forEach(record -> {
                    record.setOwnerID(customer.getUserID());
                    encryptedFileRecordRepository.save(record);
                });

    }

    private UserAccount seedUser(String username, String email, String password,
                                 String role, boolean subscribed, boolean suspended) {
        UserAccount user = userAccountRepository.findByUsernameIgnoreCase(username)
                .orElseGet(() -> new UserAccount(null, username, email, role, subscribed, suspended, null));
        user.setEmail(email);
        user.setRole(role);
        user.setSubscribed(subscribed);
        user.setSuspended(suspended);
        if (user.getPasswordHash() == null || user.getPasswordHash().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        return userAccountRepository.save(user);
    }
}
