package com.stealthsync.controller;

import com.stealthsync.model.dto.ErrorResponse;
import com.stealthsync.model.dto.LoginRequest;
import com.stealthsync.model.dto.LoginResponse;
import com.stealthsync.model.dto.SignUpRequest;
import com.stealthsync.model.dto.UserAccountDTO;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.security.JwtService;
import com.stealthsync.service.AppDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"}, allowCredentials = "true")
@RequiredArgsConstructor
@Slf4j
/** Handles public authentication and current-account operations. */
public class AuthController {

    private final AppDataService dataStore;
    private final JwtService jwtService;
    private final CurrentUserService currentUserService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        log.info("StealthSync login attempt for user/email: {}", loginRequest.getUsernameOrEmail());
        return dataStore.authenticate(loginRequest.getUsernameOrEmail(), loginRequest.getPassword())
                .<ResponseEntity<?>>map(user -> ResponseEntity.ok(
                        new LoginResponse(user, jwtService.createToken(user))))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(new ErrorResponse("Invalid credentials. Please check your username/email or password.")));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody SignUpRequest signUpRequest) {
        try {
            UserAccount user = dataStore.registerCustomer(
                    signUpRequest.getUsername(),
                    signUpRequest.getEmail(),
                    signUpRequest.getPassword()
            );
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Account registered successfully!");
            response.put("user", user);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception exception) {
            log.warn("Registration failed for username {}", signUpRequest.getUsername());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse("Registration failed: Username or Email already exists."));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<UserAccountDTO> me() {
        return ResponseEntity.ok(dataStore.toUserAccountDTO(currentUserService.requireUser()));
    }

    @PutMapping("/me")
    public ResponseEntity<UserAccountDTO> updateMe(@RequestBody Map<String, String> request) {
        return dataStore.updateUserProfile(
                        currentUserService.requireUserID(),
                        request.get("username"),
                        request.get("email"))
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/me/suspend")
    public ResponseEntity<UserAccountDTO> suspendMe() {
        return dataStore.setUserSuspended(currentUserService.requireUserID(), true)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/me/subscription")
    public ResponseEntity<Subscription> currentSubscription() {
        return dataStore.findCurrentSubscriptionForUser(currentUserService.requireUserID())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/me/subscription/cancel")
    public ResponseEntity<Subscription> cancelCurrentSubscription() {
        return dataStore.cancelCurrentSubscription(currentUserService.requireUserID())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("status", "success", "message", "Logged out successfully."));
    }
}