package com.stealthsync.controller;

import com.stealthsync.model.dto.CreateTicketResponseRequest;
import com.stealthsync.model.dto.CreateTicketRequest;
import com.stealthsync.model.entity.Ticket;
import com.stealthsync.model.entity.TicketResponse;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tickets") // Corresponding front-end management and filtering routes for work orders
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
public class TicketController {

    private final AppDataService dataStore;

    @GetMapping("/my")
    public ResponseEntity<List<Ticket>> getMyTickets() {
        return ResponseEntity.ok(dataStore.listMyTickets());
    }

    @GetMapping
    public ResponseEntity<List<Ticket>> getTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String personInCharge,
            @RequestParam(required = false) String requester) {
        log.info("StealthSync Ticket Domain: Querying tickets with filter status: {}", status);
        return ResponseEntity.ok(dataStore.listTickets(search, status, personInCharge, requester));
    }

    @PostMapping
    public ResponseEntity<Ticket> createTicket(@RequestBody CreateTicketRequest request) {
        if (request.getTicketTitle() == null || request.getTicketTitle().isBlank()
                || request.getTicketDescription() == null || request.getTicketDescription().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(dataStore.createTicket(request));
    }

    @PostMapping("/{id}/responses")
    public ResponseEntity<TicketResponse> addResponse(
            @PathVariable Long id,
            @RequestBody CreateTicketResponseRequest request) {
        return dataStore.addTicketResponse(id, request.getMessage(), request.getSenderRole())
                .map(response -> ResponseEntity.status(HttpStatus.CREATED).body(response))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/assign")
    public ResponseEntity<Ticket> assignTicket(
            @PathVariable Long id,
            @RequestBody Map<String, Long> request) {
        Long personInChargeId = request.get("personInChargeId");
        return dataStore.assignTicket(id, personInChargeId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<Ticket> closeTicket(@PathVariable Long id) {
        return dataStore.closeTicket(id)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
