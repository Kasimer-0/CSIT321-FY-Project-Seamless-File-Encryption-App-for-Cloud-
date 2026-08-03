package com.stealthsync.service;

import com.stealthsync.model.dto.DashboardStatsResponse;
import com.stealthsync.model.dto.UserAccountDTO;
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
import com.stealthsync.service.ai.AnomalyDetectorService;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AppDataServiceTest {

    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final PlanRepository planRepository = mock(PlanRepository.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final CloudStorageLinkRepository cloudStorageLinkRepository = mock(CloudStorageLinkRepository.class);
    private final EncryptedFileRecordRepository encryptedFileRecordRepository = mock(EncryptedFileRecordRepository.class);
    private final SystemLogRepository systemLogRepository = mock(SystemLogRepository.class);
    private final AnomalyDetectorService anomalyDetectorService = mock(AnomalyDetectorService.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    @Test
    void purchasePlanCreatesActiveSubscriptionForCustomer() {
        UserAccount customer = customer(false, null);
        Plan premiumPlan = plan(3L, "Premium", 15.0, "active");
        Subscription[] savedSubscription = new Subscription[1];

        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(customer));
        when(planRepository.findById(3L)).thenReturn(Optional.of(premiumPlan));
        when(subscriptionRepository.findFirstBySubscriber_UserIDOrderBySubscriptionIDDesc(2L))
                .thenReturn(Optional.empty());
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(invocation -> {
            Subscription subscription = invocation.getArgument(0);
            subscription.setSubscriptionID(9L);
            savedSubscription[0] = subscription;
            return subscription;
        });
        when(subscriptionRepository.findById(9L)).thenAnswer(invocation -> Optional.ofNullable(savedSubscription[0]));
        when(userAccountRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccountDTO updated = service().purchasePlan(2L, 3L);

        assertTrue(updated.isSubscribed());
        assertEquals(9L, customer.getSubscription());
        assertNotNull(updated.getSubscription());
        assertEquals(premiumPlan, updated.getSubscription().getPlan());
        assertEquals("active", updated.getSubscription().getSubcriptionStatus());
        assertEquals(LocalDate.now(), updated.getSubscription().getSubcriptionStartDate());
        assertEquals(LocalDate.now().plusDays(30), updated.getSubscription().getSubscriptionEndDate());
    }

    @Test
    void purchaseFreePlanCancelsCurrentSubscription() {
        UserAccount customer = customer(true, 9L);
        Plan freePlan = plan(1L, "Basic Free Tier", 0.0, "active");
        Subscription current = new Subscription(
                9L,
                plan(3L, "Premium", 15.0, "active"),
                customer,
                "active",
                LocalDate.now().minusDays(5),
                LocalDate.now().plusDays(25)
        );

        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(customer));
        when(planRepository.findById(1L)).thenReturn(Optional.of(freePlan));
        when(subscriptionRepository.findById(9L)).thenReturn(Optional.of(current));
        when(subscriptionRepository.save(any(Subscription.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userAccountRepository.save(any(UserAccount.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserAccountDTO updated = service().purchasePlan(2L, 1L);

        assertFalse(updated.isSubscribed());
        assertNull(updated.getSubscription());
        assertNull(customer.getSubscription());
        assertEquals("cancelled", current.getSubcriptionStatus());
    }

    @Test
    void purchasePlanRejectsInactivePlan() {
        UserAccount customer = customer(false, null);
        Plan inactivePlan = plan(4L, "Paused Plan", 20.0, "inactive");

        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(customer));
        when(planRepository.findById(4L)).thenReturn(Optional.of(inactivePlan));

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service().purchasePlan(2L, 4L));

        assertEquals("Selected plan is not active.", error.getMessage());
    }

    @Test
    void dashboardStatsReturnsFlaggedLogsAndRevenueStream() {
        UserAccount freeCustomer = new UserAccount(1L, "free", "free@example.com", "customer", false, true, null);
        UserAccount premiumCustomer = new UserAccount(2L, "premium", "premium@example.com", "customer", true, false, 9L);
        Plan premiumPlan = plan(3L, "Premium", 15.0, "active");
        Subscription activeSubscription = new Subscription(
                9L,
                premiumPlan,
                premiumCustomer,
                "active",
                LocalDate.now().withDayOfYear(1),
                LocalDate.now().withMonth(12).withDayOfMonth(31)
        );
        SystemLog flagged = new SystemLog();
        flagged.setAction("BULK_DOWNLOAD");

        when(userAccountRepository.findAll()).thenReturn(List.of(freeCustomer, premiumCustomer));
        when(subscriptionRepository.findAll()).thenReturn(List.of(activeSubscription));
        when(systemLogRepository.findAll()).thenReturn(List.of(flagged));
        when(anomalyDetectorService.isSuspicious(flagged)).thenReturn(true);

        DashboardStatsResponse stats = service().dashboardStats();

        assertEquals(2, stats.getTotalUsers());
        assertEquals(1, stats.getPremiumUsers());
        assertEquals(1, stats.getInactiveUsers());
        assertEquals(1, stats.getFlaggedLogsCount());
        assertEquals(12, stats.getRevenueStream().size());
        assertTrue(stats.getRevenueStream().stream().anyMatch(month -> month.revenue() == 15.0));
    }

    @Test
    void storeEncryptedFilePersistsOwnerAndKeyID() {
        byte[] ciphertext = new byte[] {1, 2, 3};
        when(encryptedFileRecordRepository.save(any(EncryptedFileRecord.class))).thenAnswer(invocation -> {
            EncryptedFileRecord record = invocation.getArgument(0);
            record.setFileID(77L);
            return record;
        });

        EncryptedFileRecord record = service().storeEncryptedFile(
                2L,
                "contract.pdf",
                240L,
                "AES-256-GCM",
                44L,
                ciphertext
        );

        assertEquals(77L, record.getFileID());
        assertEquals(2L, record.getOwnerID());
        assertEquals(44L, record.getKeyID());
        assertEquals("pdf", record.getFileType());
        assertArrayEquals(ciphertext, record.getEncryptedContent());
    }

    @Test
    void premiumCustomerCanLinkThreeCloudProviders() {
        UserAccount premiumCustomer = customer(true, 9L);
        List<CloudStorageLink> links = mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));

        assertEquals(3, service().cloudProviderLimitFor(2L));
        service().linkCloudProvider("google_drive", 2L, "google@example.com");
        service().linkCloudProvider("dropbox", 2L, "dropbox@example.com");
        service().linkCloudProvider("onedrive", 2L, "onedrive@example.com");

        assertEquals(3, links.size());
        assertTrue(links.stream().anyMatch(link -> "google_drive".equals(link.getProvider())));
        assertTrue(links.stream().anyMatch(link -> "dropbox".equals(link.getProvider())));
        assertTrue(links.stream().anyMatch(link -> "onedrive".equals(link.getProvider())));
    }

    @Test
    void reconnectingSameOwnerAndProviderUpdatesEmailWithoutCreatingDuplicateLink() {
        UserAccount premiumCustomer = customer(true, 9L);
        List<CloudStorageLink> links = mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));

        CloudStorageLink original = service().linkCloudProvider("google_drive", 2L, "first@example.com");
        CloudStorageLink updated = service().linkCloudProvider("google_drive", 2L, "second@example.com");

        assertEquals(original.getLinkID(), updated.getLinkID());
        assertEquals("second@example.com", updated.getAccountEmail());
        assertEquals(1, links.size());
    }

    @Test
    void freeCustomerProviderLimitStillApplies() {
        UserAccount freeCustomer = customer(false, null);
        mutableCloudLinkRepository(freeCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(freeCustomer));

        service().linkCloudProvider("google_drive", 2L, "google@example.com");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service().linkCloudProvider("dropbox", 2L, "dropbox@example.com"));

        assertEquals("Your plan can link up to 1 cloud storage provider.", error.getMessage());
    }

    @Test
    void linkingNewCloudProviderMakesItActiveAndDeactivatesPreviousLinks() {
        UserAccount premiumCustomer = customer(true, 9L);
        List<CloudStorageLink> links = mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));

        CloudStorageLink google = service().linkCloudProvider("google_drive", 2L, "google@example.com");
        CloudStorageLink dropbox = service().linkCloudProvider("dropbox", 2L, "dropbox@example.com");

        assertEquals(2, links.size());
        assertFalse(google.isActive());
        assertTrue(dropbox.isActive());
        assertEquals(Optional.of(dropbox), service().activeCloudStorageLink(2L));
    }

    @Test
    void activatingCloudLinkDeactivatesOtherLinksForSameUser() {
        UserAccount premiumCustomer = customer(true, 9L);
        mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));

        CloudStorageLink google = service().linkCloudProvider("google_drive", 2L, "google@example.com");
        CloudStorageLink dropbox = service().linkCloudProvider("dropbox", 2L, "dropbox@example.com");

        CloudStorageLink activated = service().setActiveCloudStorageLink(google.getLinkID(), 2L).orElseThrow();

        assertEquals(google, activated);
        assertTrue(google.isActive());
        assertFalse(dropbox.isActive());
    }

    @Test
    void deactivatingCloudLinkKeepsConnectionStatusAndRecord() {
        UserAccount premiumCustomer = customer(true, 9L);
        List<CloudStorageLink> links = mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));

        CloudStorageLink google = service().linkCloudProvider("google_drive", 2L, "google@example.com");

        CloudStorageLink deactivated = service().deactivateCloudStorageLink(google.getLinkID(), 2L).orElseThrow();

        assertFalse(deactivated.isActive());
        assertEquals("connected", deactivated.getStatus());
        assertEquals(1, links.size());
    }

    @Test
    void expiringCloudLinkKeepsOwnerRecordForOAuthReconnect() {
        UserAccount premiumCustomer = customer(true, 9L);
        List<CloudStorageLink> links = mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));
        CloudStorageLink google = service().linkCloudProvider("google_drive", 2L, "google@example.com");

        CloudStorageLink expired = service().expireCloudStorageLink(2L, "google_drive").orElseThrow();

        assertEquals(google.getLinkID(), expired.getLinkID());
        assertEquals("expired", expired.getStatus());
        assertFalse(expired.isActive());
        assertEquals(1, links.size());
    }

    @Test
    void activatingAnotherUsersCloudLinkReturnsEmpty() {
        UserAccount premiumCustomer = customer(true, 9L);
        mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));

        CloudStorageLink google = service().linkCloudProvider("google_drive", 2L, "google@example.com");

        assertTrue(service().setActiveCloudStorageLink(google.getLinkID(), 99L).isEmpty());
        assertTrue(google.isActive());
    }

    @Test
    void disconnectedCloudLinkCannotBeActivated() {
        UserAccount premiumCustomer = customer(true, 9L);
        mutableCloudLinkRepository(premiumCustomer);
        when(userAccountRepository.findById(2L)).thenReturn(Optional.of(premiumCustomer));
        CloudStorageLink google = service().linkCloudProvider("google_drive", 2L, "google@example.com");
        google.setStatus("disconnected");

        IllegalArgumentException error = assertThrows(IllegalArgumentException.class,
                () -> service().setActiveCloudStorageLink(google.getLinkID(), 2L));

        assertEquals("Only connected cloud storage links can be activated.", error.getMessage());
    }

    private AppDataService service() {
        return new AppDataService(
                userAccountRepository,
                planRepository,
                subscriptionRepository,
                cloudStorageLinkRepository,
                encryptedFileRecordRepository,
                systemLogRepository,
                anomalyDetectorService,
                passwordEncoder
        );
    }

    private UserAccount customer(boolean subscribed, Long subscriptionID) {
        return new UserAccount(2L, "user", "user@example.com", "customer", subscribed, false, subscriptionID);
    }

    private Plan plan(Long planID, String title, double price, String status) {
        return new Plan(planID, title, price, "Description", status, "AES-256-GCM");
    }

    private List<CloudStorageLink> mutableCloudLinkRepository(UserAccount owner) {
        List<CloudStorageLink> links = new ArrayList<>();
        long[] nextID = {1L};
        when(cloudStorageLinkRepository.findByOwnerID(owner.getUserID())).thenAnswer(invocation -> List.copyOf(links));
        when(cloudStorageLinkRepository.findByOwnerID(anyLong())).thenAnswer(invocation -> List.copyOf(links));
        when(cloudStorageLinkRepository.findByLinkIDAndOwnerID(anyLong(), anyLong())).thenAnswer(invocation -> {
            Long linkID = invocation.getArgument(0);
            Long ownerID = invocation.getArgument(1);
            return links.stream()
                    .filter(link -> link.getLinkID().equals(linkID))
                    .filter(link -> link.getOwnerID().equals(ownerID))
                    .findFirst();
        });
        when(cloudStorageLinkRepository.findByOwnerIDAndProviderIgnoreCase(anyLong(), anyString())).thenAnswer(invocation -> {
            Long ownerID = invocation.getArgument(0);
            String provider = invocation.getArgument(1);
            return links.stream()
                    .filter(link -> link.getOwnerID().equals(ownerID))
                    .filter(link -> link.getProvider().equalsIgnoreCase(provider))
                    .findFirst();
        });
        when(cloudStorageLinkRepository.save(any(CloudStorageLink.class))).thenAnswer(invocation -> {
            CloudStorageLink link = invocation.getArgument(0);
            if (link.getLinkID() == null) {
                link.setLinkID(nextID[0]++);
                links.add(link);
            }
            return link;
        });
        when(cloudStorageLinkRepository.saveAll(any())).thenAnswer(invocation -> invocation.getArgument(0));
        return links;
    }
}
