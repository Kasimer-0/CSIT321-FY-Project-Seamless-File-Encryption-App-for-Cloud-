package com.stealthsync.controller;

import com.stealthsync.model.entity.Ticket;
import com.stealthsync.model.entity.UserAccount;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/tickets") // Corresponding front-end management and filtering routes for work orders
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@Slf4j
public class TicketController {

    private final UserAccount admin = new UserAccount(1L, "admin", "admin@stealthsync.com", "admin", true, false);
    private final UserAccount customer = new UserAccount(2L, "PremiumUser", "user@stealthsync.com", "customer", true, false);
    private final List<Ticket> mockTickets = createMockTickets();

    @GetMapping
    public ResponseEntity<List<Ticket>> getTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personInCharge,
            @RequestParam(required = false) String requester) {
        log.info("StealthSync Ticket Domain: Querying tickets with filter status: {}", status);
        List<Ticket> tickets = mockTickets.stream()
                .filter(ticket -> search == null || search.isBlank()
                        || ticket.getTicketTitle().toLowerCase().contains(search.toLowerCase()))
                .filter(ticket -> status == null || status.isBlank()
                        || ticket.getTicketStatus().equalsIgnoreCase(status))
                .filter(ticket -> requester == null || requester.isBlank()
                        || ticket.getTicketRequester().getId().toString().equals(requester))
                .filter(ticket -> personInCharge == null || personInCharge.isBlank()
                        || ("unassigned".equals(personInCharge) && ticket.getPersonInCharge() == null)
                        || (ticket.getPersonInCharge() != null
                        && ticket.getPersonInCharge().getId().toString().equals(personInCharge)))
                .collect(Collectors.toList());
        return ResponseEntity.ok(tickets);
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @RequestBody Map<String, Long> request) {
        Long personInChargeId = request.get("personInChargeId");
        UserAccount assignee = admin.getId().equals(personInChargeId)
                ? admin
                : new UserAccount(personInChargeId, "AdminUser", "admin.user@stealthsync.com", "admin", true, false);

        return mockTickets.stream()
                .filter(ticket -> ticket.getTicketID().equals(id))
                .findFirst()
                .map(ticket -> {
                    ticket.setPersonInCharge(assignee);
                    return ResponseEntity.ok(ticket);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<Ticket> closeTicket(@PathVariable Long id) {
        return mockTickets.stream()
                .filter(ticket -> ticket.getTicketID().equals(id))
                .findFirst()
                .map(ticket -> {
                    ticket.setTicketStatus("closed");
                    return ResponseEntity.ok(ticket);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    private List<Ticket> createMockTickets() {
        List<Ticket> tickets = new ArrayList<>();
        tickets.add(new Ticket(
                1L,
                "Cannot decrypt uploaded file",
                "User reports that decryption fails after downloading an encrypted cloud backup.",
                "open",
                customer,
                null
        ));
        tickets.add(new Ticket(
                2L,
                "Plan upgrade question",
                "Customer wants to confirm whether AES-256-GCM is included in the premium plan.",
                "open",
                customer,
                admin
        ));
        return tickets;
    }
}
