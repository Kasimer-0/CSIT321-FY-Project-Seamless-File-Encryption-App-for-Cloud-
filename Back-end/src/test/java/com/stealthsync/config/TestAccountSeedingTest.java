package com.stealthsync.config;

import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:seed-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/test-vault"
})
@Transactional
class TestAccountSeedingTest {

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private EncryptedFileRecordRepository encryptedFileRecordRepository;

    @Autowired
    private PlanRepository planRepository;

    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @Autowired
    private DataSeeder dataSeeder;

    @Test
    void createsAdminAndNormalCustomerCredentials() {
        UserAccount admin = userAccountRepository.findByUsernameIgnoreCase("admin").orElseThrow();
        assertEquals("admin", admin.getRole());
        assertFalse(admin.isSuspended());
        assertTrue(passwordEncoder.matches("Admin@123", admin.getPasswordHash()));

        UserAccount customer = userAccountRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        assertEquals("customer", customer.getRole());
        assertFalse(customer.isSubscribed());
        assertFalse(customer.isSuspended());
        assertTrue(passwordEncoder.matches("User@123", customer.getPasswordHash()));
    }

    @Test
    void doesNotSeedLegacyEncryptedFileRecords() {
        assertEquals(0, encryptedFileRecordRepository.count());
    }

    @Test
    void seedsFinalPremiumMonthlyPrice() {
        assertEquals(7.0, planRepository.findByPlanTitleIgnoreCase("Premium Corporate Tier")
                .orElseThrow()
                .getPlanPrice());
    }

    @Test
    void migratesPreviousSeededPremiumPriceWithoutDuplicatingPlan() throws Exception {
        var premiumPlan = planRepository.findByPlanTitleIgnoreCase("Premium Corporate Tier").orElseThrow();
        premiumPlan.setPlanPrice(15.0);
        planRepository.saveAndFlush(premiumPlan);

        long planCount = planRepository.count();
        dataSeeder.run();

        assertEquals(planCount, planRepository.count());
        assertEquals(7.0, planRepository.findByPlanTitleIgnoreCase("Premium Corporate Tier")
                .orElseThrow()
                .getPlanPrice());
    }

    @Test
    void restoresCancelledSeededPremiumSubscription() throws Exception {
        UserAccount premiumUser = userAccountRepository.findByUsernameIgnoreCase("PremiumUser").orElseThrow();
        var subscription = subscriptionRepository
                .findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(premiumUser.getUserID())
                .orElseThrow();
        Long originalSubscriptionID = subscription.getSubscriptionID();
        var originalEndDate = subscription.getSubscriptionEndDate();

        subscription.setSubcriptionStatus("cancelled");
        subscriptionRepository.saveAndFlush(subscription);
        premiumUser.setSubscribed(false);
        userAccountRepository.saveAndFlush(premiumUser);

        dataSeeder.run();

        UserAccount restoredUser = userAccountRepository.findById(premiumUser.getUserID()).orElseThrow();
        var restoredSubscription = subscriptionRepository
                .findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(restoredUser.getUserID())
                .orElseThrow();
        assertTrue(restoredUser.isSubscribed());
        assertEquals(originalSubscriptionID, restoredSubscription.getSubscriptionID());
        assertEquals("active", restoredSubscription.getSubcriptionStatus());
        assertEquals(originalEndDate, restoredSubscription.getSubscriptionEndDate());
    }
}
