package com.stealthsync.controller;

import com.stealthsync.model.entity.SystemLog;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173") // Front-end application for joint debugging team members
public class AdminController {

    /**
     * US-AI-2: An interface specifically designed for the front-end "suspicious log audit dashboard," returning only logs marked as Suspicious by AI.
     */
    @GetMapping("/logs/suspicious")
    public ResponseEntity<List<SystemLog>> getSuspiciousLogs() {
        // The AI ​​filtering logic from the service layer will then be called here.
        return ResponseEntity.ok().build();
    }

    /**
     * Provides an interface for regular log review forms [cite: 2092]
     */
    @GetMapping("/logs")
    public ResponseEntity<List<SystemLog>> getAllLogs() {
        return ResponseEntity.ok().build();
    }
}