package com.stealthsync.controller;

import com.stealthsync.model.entity.Ticket;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/tickets") // Corresponding front-end management and filtering routes for work orders
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true")
@Slf4j
public class TicketController {

    @GetMapping
    public ResponseEntity<List<Ticket>> getTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        log.info("StealthSync Ticket Domain: Querying tickets with filter status: {}", status);
        List<Ticket> tickets = new ArrayList<>();
        // TODO: Integrate with the repository for persistent dynamic queries.
        return ResponseEntity.ok(tickets);
    }
}