package com.stealthsync.controller;

import com.stealthsync.model.dto.LoginResponse;
import com.stealthsync.model.dto.LoginRequest;
import com.stealthsync.model.dto.SignUpRequest;
import com.stealthsync.model.dto.ErrorResponse;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.service.MockDataStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/") // Directly map to the root path, connecting to the frontend's /login and /signup
@CrossOrigin(origins = "http://localhost:5173", allowCredentials = "true") // Allow React (Vite) frontend to make cross-origin requests
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final MockDataStore dataStore;

    /**
     * Connect to the handleLogin method in LoginForm.tsx.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        log.info("StealthSync Auth: Login attempt for user/email: {}", loginRequest.getUsernameOrEmail());

        // Simulated login verification logic (temporarily hardcoded in the Prototype phase for frontend integration testing).
        return dataStore.authenticate(loginRequest.getUsernameOrEmail(), loginRequest.getPassword())
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(new LoginResponse(user)))
                .orElseGet(() -> {
                    log.warn("Login failed for user: {}", loginRequest.getUsernameOrEmail());
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(new ErrorResponse("Invalid credentials. Please check your username/email or password."));
                });
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
            UserAccount user = dataStore.registerCustomer(signUpRequest.getUsername(), signUpRequest.getEmail());
            Map<String, Object> successResponse = new HashMap<>();
            successResponse.put("status", "success");
            successResponse.put("message", "Account registered successfully!");
            successResponse.put("user", user);

            return ResponseEntity.status(HttpStatus.CREATED).body(successResponse);
        } catch (Exception e) {
            log.error("Registration failed", e);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("Registration failed: Username or Email already exists."));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Logged out successfully."
        ));
    }
}
