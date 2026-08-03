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
import com.stealthsync.service.security.DeviceIdentifierService;
import com.stealthsync.service.security.DeviceRegistrationService;
import com.stealthsync.service.security.SecurityAuditService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
@Slf4j
/** Handles public authentication and current-account operations. */
public class AuthController {

    private final AppDataService dataStore;
    private final JwtService jwtService;
    private final CurrentUserService currentUserService;
    private final DeviceRegistrationService deviceRegistrationService;
    private final SecurityAuditService securityAuditService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        log.info("StealthSync login attempt for user/email: {}", loginRequest.getUsernameOrEmail());
        Optional<UserAccount> authenticated = dataStore.authenticate(
                loginRequest.getUsernameOrEmail(), loginRequest.getPassword());
        if (authenticated.isEmpty()) {
            securityAuditService.recordLogin(loginRequest.getUsernameOrEmail(), "LOGIN_FAILED");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ErrorResponse("Invalid credentials. Please check your username/email or password."));
        }
        UserAccount user = authenticated.get();
        var device = deviceRegistrationService.registerOrValidate(
                user,
                request.getHeader(DeviceIdentifierService.HEADER_NAME),
                loginRequest.getDeviceName(),
                loginRequest.getPlatform());
        securityAuditService.recordForUser(user.getUserID(), "LOGIN_SUCCESS", null);
        return ResponseEntity.ok(new LoginResponse(user, jwtService.createToken(
                user, device == null ? null : device.getDeviceIdentifierHash())));
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
        } catch (IllegalArgumentException exception) {
            log.warn("Registration failed for username {}", signUpRequest.getUsername());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ErrorResponse(exception.getMessage()));
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
    public ResponseEntity<Map<String, String>> logout(HttpServletRequest request) {
        UserAccount user = currentUserService.requireUser();
        if ("customer".equalsIgnoreCase(user.getRole())) {
            deviceRegistrationService.signOut(
                    user.getUserID(),
                    request.getHeader(DeviceIdentifierService.HEADER_NAME));
        }
        return ResponseEntity.ok(Map.of("status", "success", "message", "Logged out successfully."));
    }
}
