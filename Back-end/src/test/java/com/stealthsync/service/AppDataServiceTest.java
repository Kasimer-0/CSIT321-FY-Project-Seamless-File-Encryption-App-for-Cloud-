package com.stealthsync.service;

import com.stealthsync.model.dto.UserAccountDTO;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.Ticket;
import com.stealthsync.model.entity.TicketResponse;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.TicketRepository;
import com.stealthsync.repository.TicketResponseRepository;
import com.stealthsync.repository.UserAccountRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AppDataServiceTest {

    private final UserAccountRepository userAccountRepository = mock(UserAccountRepository.class);
    private final PlanRepository planRepository = mock(PlanRepository.class);
    private final TicketRepository ticketRepository = mock(TicketRepository.class);
    private final SubscriptionRepository subscriptionRepository = mock(SubscriptionRepository.class);
    private final CloudStorageLinkRepository cloudStorageLinkRepository = mock(CloudStorageLinkRepository.class);
    private final EncryptedFileRecordRepository encryptedFileRecordRepository = mock(EncryptedFileRecordRepository.class);
    private final TicketResponseRepository ticketResponseRepository = mock(TicketResponseRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    @Test
    void addTicketResponseSavesMessageAndSenderRole() {
        Ticket ticket = ticket();
        when(ticketRepository.findById(7L)).thenReturn(Optional.of(ticket));
        when(ticketResponseRepository.save(any(TicketResponse.class))).thenAnswer(invocation -> {
            TicketResponse response = invocation.getArgument(0);
            response.setResponseId(42L);
            return response;
        });

        Optional<TicketResponse> saved = service().addTicketResponse(7L, " Please check this file. ", "ADMIN");

        assertTrue(saved.isPresent());
        assertEquals(42L, saved.get().getResponseId());
        assertEquals("Please check this file.", saved.get().getMessage());
        assertEquals("admin", saved.get().getSenderRole());
        assertEquals(ticket, saved.get().getTicket());
    }

    @Test
    void addTicketResponseRejectsUnknownSenderRole() {
        when(ticketRepository.findById(7L)).thenReturn(Optional.of(ticket()));

        assertThrows(IllegalArgumentException.class,
                () -> service().addTicketResponse(7L, "Hello", "manager"));
    }

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

    private AppDataService service() {
        return new AppDataService(
                userAccountRepository,
                planRepository,
                ticketRepository,
                subscriptionRepository,
                cloudStorageLinkRepository,
                encryptedFileRecordRepository,
                ticketResponseRepository,
                passwordEncoder
        );
    }

    private Ticket ticket() {
        return new Ticket(7L, "Title", "Description", "open", customer(false, null), null, new ArrayList<>());
    }

    private UserAccount customer(boolean subscribed, Long subscriptionID) {
        return new UserAccount(2L, "user", "user@example.com", "customer", subscribed, false, subscriptionID);
    }

    private Plan plan(Long planID, String title, double price, String status) {
        return new Plan(planID, title, price, "Description", status, "AES-256-GCM");
    }
}
