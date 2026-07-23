package com.stealthsync.service.security;

import com.stealthsync.exception.DeviceAccessDeniedException;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.model.entity.UserDevice;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.repository.UserDeviceRepository;
import com.stealthsync.service.crypto.EncryptionKeyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:device-policy-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/device-policy-test-vault",
        "stealthsync.jwt.secret=device-policy-test-signing-secret"
})
class DeviceRegistrationServiceTest {

    @Autowired private DeviceRegistrationService deviceService;
    @Autowired private DeviceIdentifierService identifierService;
    @Autowired private UserDeviceRepository deviceRepository;
    @Autowired private UserAccountRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private EncryptionKeyService encryptionKeyService;

    private UserAccount freeUser;
    private UserAccount premiumUser;
    private Subscription premiumSubscription;

    @BeforeEach
    void resetDeviceAndSubscriptionState() {
        deviceRepository.deleteAll();
        userRepository.findAll().forEach(user -> {
            user.setSubscription(null);
            user.setSubscribed(false);
            userRepository.save(user);
        });
        subscriptionRepository.deleteAll();

        freeUser = userRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        premiumUser = userRepository.findByUsernameIgnoreCase("PremiumUser").orElseThrow();
        Plan premiumPlan = planRepository.findByPlanTitleIgnoreCase("Premium Corporate Tier").orElseThrow();
        premiumSubscription = subscriptionRepository.save(new Subscription(
                null,
                premiumPlan,
                premiumUser,
                "active",
                LocalDate.now(),
                LocalDate.now().plusDays(30)
        ));
        premiumUser.setSubscribed(true);
        premiumUser.setSubscription(premiumSubscription.getSubscriptionID());
        premiumUser = userRepository.save(premiumUser);
    }

    @Test
    void freeUserCanRegisterFirstDevice() {
        UserDevice device = register(freeUser, "free-a");
        assertTrue(device.isPrimaryDevice());
        assertTrue(device.isActive());
    }

    @Test
    void sameFreeDeviceCanSignInAgainWithoutCreatingDuplicate() {
        UserDevice first = register(freeUser, "free-a");
        UserDevice repeated = register(freeUser, "free-a");
        assertEquals(first.getDeviceID(), repeated.getDeviceID());
        assertEquals(1, deviceRepository.findByOwnerIDOrderByFirstSeenAtAsc(freeUser.getUserID()).size());
    }

    @Test
    void freeUserSecondDeviceIsRejectedWithExplicitPremiumMessage() {
        register(freeUser, "free-a");
        DeviceAccessDeniedException error = assertThrows(DeviceAccessDeniedException.class,
                () -> register(freeUser, "free-b"));
        assertEquals(DeviceRegistrationService.FREE_SECOND_DEVICE_MESSAGE, error.getMessage());
    }

    @Test
    void premiumUserCanUseTwoDevices() {
        register(premiumUser, "premium-a");
        register(premiumUser, "premium-b");
        assertEquals(2, deviceRepository.countByOwnerIDAndActiveTrueAndRevokedAtIsNull(premiumUser.getUserID()));
    }

    @Test
    void premiumUserCanUseFiveButNotSixDevices() {
        for (int index = 1; index <= 5; index++) {
            register(premiumUser, "premium-" + index);
        }
        DeviceAccessDeniedException error = assertThrows(DeviceAccessDeniedException.class,
                () -> register(premiumUser, "premium-6"));
        assertEquals(DeviceRegistrationService.PREMIUM_DEVICE_LIMIT_MESSAGE, error.getMessage());
    }

    @Test
    void ownerCannotRenameOrRevokeAnotherUsersDevice() {
        register(premiumUser, "premium-a");
        UserDevice other = register(freeUser, "free-a");
        assertThrows(IllegalArgumentException.class, () -> deviceService.rename(
                premiumUser.getUserID(), other.getDeviceID(), "premium-a", "Tampered"));
        assertThrows(IllegalArgumentException.class, () -> deviceService.revoke(
                premiumUser.getUserID(), other.getDeviceID(), "premium-a"));
    }

    @Test
    void premiumCancellationLeavesOnlyPrimaryDeviceActive() {
        UserDevice primary = register(premiumUser, "premium-a");
        UserDevice secondary = register(premiumUser, "premium-b");
        premiumSubscription.setSubcriptionStatus("cancelled");
        subscriptionRepository.save(premiumSubscription);
        premiumUser.setSubscribed(false);
        premiumUser.setSubscription(null);
        userRepository.save(premiumUser);

        assertEquals(primary.getDeviceID(), deviceService.requireAccess(premiumUser.getUserID(), "premium-a").getDeviceID());
        assertThrows(DeviceAccessDeniedException.class,
                () -> deviceService.requireAccess(premiumUser.getUserID(), "premium-b"));
        assertFalse(deviceRepository.findById(secondary.getDeviceID()).orElseThrow().isActive());
    }

    @Test
    void revokedDeviceCannotUseProtectedAccessAgain() {
        register(premiumUser, "premium-a");
        UserDevice secondary = register(premiumUser, "premium-b");
        deviceService.revoke(premiumUser.getUserID(), secondary.getDeviceID(), "premium-a");
        assertThrows(DeviceAccessDeniedException.class,
                () -> deviceService.requireAccess(premiumUser.getUserID(), "premium-b"));
    }

    @Test
    void twoPremiumDevicesReadTheSameBrowserKeyMetadata() {
        register(premiumUser, "premium-a");
        register(premiumUser, "premium-b");
        EncryptionKeyRecord createdOnA = encryptionKeyService.createClientDerivedKey(
                premiumUser.getUserID(), "Shared browser key", "AES-256-GCM",
                "AAAAAAAAAAAAAAAAAAAAAA", "ABCDEFGHIJKLMNOP",
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                EncryptionKeyService.KEY_SCHEME_V2,
                EncryptionKeyService.KDF_ITERATIONS_V2,
                EncryptionKeyService.KDF_VERSION_V2);

        EncryptionKeyRecord readOnB = encryptionKeyService
                .findKey(premiumUser.getUserID(), createdOnA.getKeyID()).orElseThrow();
        assertEquals(createdOnA.getSalt(), readOnB.getSalt());
        assertEquals(createdOnA.getFingerprint(), readOnB.getFingerprint());
        assertEquals(createdOnA.getPasswordVerifier(), readOnB.getPasswordVerifier());
        assertEquals(EncryptionKeyService.KEY_SCHEME_V2, readOnB.getKeyScheme());
    }

    @Test
    void databaseStoresIdentifierHashInsteadOfRawUuid() {
        UserDevice device = register(freeUser, "raw-device-uuid-value");
        assertEquals(identifierService.requireHash("raw-device-uuid-value"), device.getDeviceIdentifierHash());
        assertNotEquals("raw-device-uuid-value", device.getDeviceIdentifierHash());
    }

    private UserDevice register(UserAccount user, String rawID) {
        return deviceService.registerOrValidate(user, rawID, "Windows Test", "Windows");
    }
}
