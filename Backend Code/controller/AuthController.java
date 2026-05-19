package com.stealthsync.controller;

import com.stealthsync.model.dto.LoginRequest;
import com.stealthsync.model.dto.SignUpRequest;
import com.stealthsync.model.dto.ErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/") // Directly map to the root path, connecting to the frontend's /login and /signup
@CrossOrigin(origins = "http://localhost:5173") // Allow React (Vite) frontend to make cross-origin requests
@Slf4j
public class AuthController {

    /**
     * Connect to the handleLogin method in LoginForm.tsx.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        log.info("StealthSync Auth: Login attempt for user/email: {}", loginRequest.getUsernameOrEmail());

        // Simulated login verification logic (temporarily hardcoded in the Prototype phase for frontend integration testing).
        if ("admin".equals(loginRequest.getUsernameOrEmail()) && "Admin@123".equals(loginRequest.getPassword())) {
            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("status", "success");
            successResponse.put("role", "admin");
            successResponse.put("username", "admin");
            return ResponseEntity.ok(successResponse);
        } else if ("user@stealthsync.com".equals(loginRequest.getUsernameOrEmail()) && "User@1234".equals(loginRequest.getPassword())) {
            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("status", "success");
            successResponse.put("role", "customer");
            successResponse.put("username", "PremiumUser");
            return ResponseEntity.ok(successResponse);
        }

        // Validation failed: Returns a 401 status code along with JSON that matches the frontend's data.message expectations.
        log.warn("Login failed for user: {}", loginRequest.getUsernameOrEmail());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("Invalid credentials. Please check your username/email or password."));
    }

    /**
     * Connect to the handleSignup method in SignUpForm.tsx.
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody SignUpRequest signUpRequest) {
        log.info("StealthSync Auth: Registration attempt for username: {}, email: {}", 
                signUpRequest.getUsername(), signUpRequest.getEmail());

        try {
            // Simulated registration success response for the Prototype phase
            Map<String, String> successResponse = new HashMap<>();
            successResponse.put("status", "success");
            successResponse.put("message", "Account registered successfully!");
            
            return ResponseEntity.status(HttpStatus.CREATED).body(successResponse);
        } catch (Exception e) {
            log.error("Registration failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("Registration failed: Username or Email already exists."));
        }
    }
}