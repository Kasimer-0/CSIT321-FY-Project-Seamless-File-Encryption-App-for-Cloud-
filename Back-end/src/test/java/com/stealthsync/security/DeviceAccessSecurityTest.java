package com.stealthsync.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.model.entity.UserDevice;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.repository.UserDeviceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:device-security-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/device-security-test-vault",
        "stealthsync.jwt.secret=device-security-test-signing-secret"
})
class DeviceAccessSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserDeviceRepository deviceRepository;
    @Autowired private UserAccountRepository userRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private SystemLogRepository logRepository;

    private UserAccount freeUser;
    private UserAccount premiumUser;

    @BeforeEach
    void resetState() {
        deviceRepository.deleteAll();
        logRepository.deleteAll();
        userRepository.findAll().forEach(user -> {
            user.setSubscription(null);
            user.setSubscribed(false);
            userRepository.save(user);
        });
        subscriptionRepository.deleteAll();
        freeUser = userRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        premiumUser = userRepository.findByUsernameIgnoreCase("PremiumUser").orElseThrow();
        Plan plan = planRepository.findByPlanTitleIgnoreCase("Premium Corporate Tier").orElseThrow();
        Subscription subscription = subscriptionRepository.save(new Subscription(
                null, plan, premiumUser, "active", LocalDate.now(), LocalDate.now().plusDays(30)));
        premiumUser.setSubscribed(true);
        premiumUser.setSubscription(subscription.getSubscriptionID());
        premiumUser = userRepository.save(premiumUser);
    }

    @Test
    void freeLoginAllowsSameDeviceAndRejectsSecondDevice() throws Exception {
        login("testuser", "User@123", "free-device-a").andExpect(status().isOk());
        login("testuser", "User@123", "free-device-a").andExpect(status().isOk());
        login("testuser", "User@123", "free-device-b")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(
                        "Multi-device access requires an active premium subscription."));
    }

    @Test
    void freeLogoutReleasesTheDeviceSlotForAnotherDevice() throws Exception {
        String firstToken = token(login("testuser", "User@123", "free-device-a"));

        mockMvc.perform(post("/logout")
                        .header(HttpHeaders.AUTHORIZATION, bearer(firstToken))
                        .header("X-StealthSync-Device-ID", "free-device-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));

        mockMvc.perform(get("/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(firstToken))
                        .header("X-StealthSync-Device-ID", "free-device-a"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This device is inactive. Sign in again."));

        login("testuser", "User@123", "free-device-b").andExpect(status().isOk());
    }

    @Test
    void revokedPremiumDeviceCannotContinueUsingProtectedApi() throws Exception {
        String tokenA = token(login("PremiumUser", "User@1234", "premium-device-a"));
        String tokenB = token(login("PremiumUser", "User@1234", "premium-device-b"));
        UserDevice deviceB = deviceRepository.findByOwnerIDOrderByFirstSeenAtAsc(premiumUser.getUserID()).stream()
                .filter(device -> !device.isPrimaryDevice())
                .findFirst()
                .orElseThrow();

        mockMvc.perform(delete("/devices/{id}", deviceB.getDeviceID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenA))
                        .header("X-StealthSync-Device-ID", "premium-device-a"))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(tokenB))
                        .header("X-StealthSync-Device-ID", "premium-device-b"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This device has been revoked."));
    }

    @Test
    void customerTokenCannotBeMovedToAnotherDeviceHeader() throws Exception {
        String token = token(login("testuser", "User@123", "bound-device"));
        mockMvc.perform(get("/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .header("X-StealthSync-Device-ID", "different-device"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Authentication token is bound to a different device."));
    }

    @Test
    void deviceApiIsOwnerScopedAndAdminCannotUseCustomerRoute() throws Exception {
        String freeToken = token(login("testuser", "User@123", "free-device-a"));
        login("PremiumUser", "User@1234", "premium-device-a").andExpect(status().isOk());

        mockMvc.perform(get("/devices")
                        .queryParam("ownerID", premiumUser.getUserID().toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(freeToken))
                        .header("X-StealthSync-Device-ID", "free-device-a"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].ownerID").value(freeUser.getUserID()))
                .andExpect(jsonPath("$[1]").doesNotExist());

        String adminToken = token(login("admin", "Admin@123", "admin-device"));
        mockMvc.perform(get("/devices")
                        .header(HttpHeaders.AUTHORIZATION, bearer(adminToken))
                        .header("X-StealthSync-Device-ID", "admin-device"))
                .andExpect(status().isForbidden());
    }

    @Test
    void fiveRealLoginFailuresPersistAHighRiskEvent() throws Exception {
        for (int index = 0; index < 5; index++) {
            login("testuser", "wrong-password", "failed-login-device")
                    .andExpect(status().isUnauthorized());
        }
        org.junit.jupiter.api.Assertions.assertTrue(logRepository.findAll().stream()
                .anyMatch(log -> "LOGIN_FAILED".equals(log.getAction())
                        && "HIGH".equals(log.getRiskLevel())
                        && log.isSuspicious()));
    }

    private org.springframework.test.web.servlet.ResultActions login(
            String username, String password, String deviceID) throws Exception {
        return mockMvc.perform(post("/login")
                .header("X-StealthSync-Device-ID", deviceID)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(java.util.Map.of(
                        "usernameOrEmail", username,
                        "password", password,
                        "deviceName", "Windows Test",
                        "platform", "Windows"
                ))));
    }

    private String token(org.springframework.test.web.servlet.ResultActions login) throws Exception {
        String response = login.andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode json = objectMapper.readTree(response);
        return json.get("token").asText();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
