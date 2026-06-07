package com.stealthsync.service;

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

import java.util.ArrayList;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
        UserAccount customer = new UserAccount(2L, "user", "user@example.com", "customer", false, false, null);
        return new Ticket(7L, "Title", "Description", "open", customer, null, new ArrayList<>());
    }
}
