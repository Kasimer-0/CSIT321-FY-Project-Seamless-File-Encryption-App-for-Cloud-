package com.stealthsync.config;

import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.SystemLog;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
/**
 * Creates deterministic demo plans, test accounts, and sample records at startup.
 * Lookups are idempotent so repeated launches do not duplicate seeded business data.
 */
public class DataSeeder implements CommandLineRunner {

    private final UserAccountRepository userAccountRepository;
    private final PlanRepository planRepository;
    private final SubscriptionRepository subscriptionRepository;
    private final CloudStorageLinkRepository cloudStorageLinkRepository;
    private final EncryptedFileRecordRepository encryptedFileRecordRepository;
    private final SystemLogRepository systemLogRepository;
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
                        15.0,
                        "AES-256 GCM Stream Encryption with Hardware Token Support",
                        "active",
                        "AES-256-GCM"
                )));

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

        // Sample operational data is inserted only into empty tables to avoid overwriting user work.

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

        if (encryptedFileRecordRepository.count() == 0) {
            encryptedFileRecordRepository.save(new EncryptedFileRecord(
                    null,
                    customer.getUserID(),
                    "sample-contract.pdf",
                    245760,
                    "pdf",
                    Instant.now().minusSeconds(3600),
                    "AES-256-GCM",
                    1001L,
                    new byte[0]
            ));
        }

        // Assign records created by older prototypes before owner isolation was introduced.
        encryptedFileRecordRepository.findAll().stream()
                .filter(record -> record.getOwnerID() == null)
                .forEach(record -> {
                    record.setOwnerID(customer.getUserID());
                    encryptedFileRecordRepository.save(record);
                });

        if (systemLogRepository.count() == 0) {
            systemLogRepository.save(log("admin", "LOGIN_SUCCESS", "127.0.0.1", false, "Normal admin login."));
            systemLogRepository.save(log("PremiumUser", "FILE_UPLOAD_ENCRYPTED", "127.0.0.1", false, "Encrypted file upload completed."));
            systemLogRepository.save(log("PremiumUser", "BULK_DOWNLOAD_SPIKE", "203.0.113.25", true, "Bulk download spike detected by anomaly rules."));
            systemLogRepository.save(log("unknown", "LOGIN_ATTEMPT_UNUSUAL_LOCATION", "198.51.100.8", true, "Unusual login location for a customer account."));
        }

    }

    private SystemLog log(String username, String action, String ipAddress, boolean suspicious, String reason) {
        SystemLog log = new SystemLog();
        log.setUsername(username);
        log.setAction(action);
        log.setIpAddress(ipAddress);
        log.setTimestamp(LocalDateTime.now().minusHours(systemLogRepository.count() + 1));
        log.setSuspicious(suspicious);
        log.setAiRiskReason(reason);
        return log;
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
