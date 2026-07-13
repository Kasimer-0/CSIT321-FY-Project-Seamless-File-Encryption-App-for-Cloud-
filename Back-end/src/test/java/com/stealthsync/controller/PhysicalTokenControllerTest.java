package com.stealthsync.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.JwtService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.nullValue;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:physical-token-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/physical-token-test-vault",
        "stealthsync.jwt.secret=physical-token-test-signing-secret"
})
class PhysicalTokenControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private EncryptionKeyService encryptionKeyService;

    @Autowired
    private JwtService jwtService;

    private UserAccount premiumUser;
    private UserAccount freeUser;
    private UserAccount otherPremiumUser;
    private EncryptionKeyRecord premiumKey;
    private EncryptionKeyRecord otherKey;
    private String premiumToken;
    private String freeToken;

    @BeforeEach
    void setUp() {
        premiumUser = userAccountRepository.findByUsernameIgnoreCase("PremiumUser").orElseThrow();
        freeUser = userAccountRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        otherPremiumUser = new UserAccount(null, "token-owner-b", "token-owner-b@stealthsync.test", "customer", true, false, null);
        otherPremiumUser.setPasswordHash("test-password-hash");
        otherPremiumUser = userAccountRepository.save(otherPremiumUser);

        premiumKey = encryptionKeyService.createKey(premiumUser.getUserID(), "Token key A", "AES-256-GCM", "TokenKey@123");
        otherKey = encryptionKeyService.createKey(otherPremiumUser.getUserID(), "Token key B", "AES-128", "TokenKey@456");
        premiumToken = jwtService.createToken(premiumUser);
        freeToken = jwtService.createToken(freeUser);
    }

    @Test
    void premiumUserCanRegisterListActivateDeactivateAndDeleteToken() throws Exception {
        long tokenID = registerToken(premiumKey.getKeyID());

        mockMvc.perform(get("/physical-tokens").header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tokenID").value(tokenID))
                .andExpect(jsonPath("$[0].encryptionKeyID").value(premiumKey.getKeyID()))
                .andExpect(jsonPath("$[0].rawKey").doesNotExist())
                .andExpect(jsonPath("$[0].keyPassword").doesNotExist());

        mockMvc.perform(patch("/physical-tokens/{id}/activate", tokenID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"));

        mockMvc.perform(patch("/physical-tokens/{id}/deactivate", tokenID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("inactive"));

        mockMvc.perform(delete("/physical-tokens/{id}", tokenID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/physical-tokens/{id}", tokenID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void premiumUserCanRegisterTokenWithoutKeyAssociation() throws Exception {
        mockMvc.perform(post("/physical-tokens")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tokenName\":\"Unassociated token\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.encryptionKeyID").value(nullValue()))
                .andExpect(jsonPath("$.rawKey").doesNotExist());
    }

    @Test
    void existingTokenRemainsVisibleAfterAssociatedKeyIsRetired() throws Exception {
        long tokenID = registerToken(premiumKey.getKeyID());
        encryptionKeyService.deleteKey(premiumUser.getUserID(), premiumKey.getKeyID());

        mockMvc.perform(get("/physical-tokens/{id}", tokenID)
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.encryptionKeyID").value(premiumKey.getKeyID()));

        mockMvc.perform(post("/physical-tokens")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "tokenName", "Blocked retired association",
                                "encryptionKeyID", premiumKey.getKeyID()
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Selected encryption key must be active."));
    }

    @Test
    void freeUserCannotRegisterOrListPhysicalTokens() throws Exception {
        mockMvc.perform(get("/physical-tokens").header(HttpHeaders.AUTHORIZATION, bearer(freeToken)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Premium subscription required."));

        mockMvc.perform(post("/physical-tokens")
                        .header(HttpHeaders.AUTHORIZATION, bearer(freeToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"tokenName\":\"Blocked token\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Premium subscription required."));
    }

    @Test
    void userCannotAssociateAnotherOwnersEncryptionKey() throws Exception {
        mockMvc.perform(post("/physical-tokens")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "tokenName", "Cross-owner token",
                                "encryptionKeyID", otherKey.getKeyID()
                        ))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Selected encryption key does not belong to the current user."));
    }

    @Test
    void deletingMissingTokenReturnsNotFound() throws Exception {
        mockMvc.perform(delete("/physical-tokens/{id}", 999999L)
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isNotFound());
    }

    private long registerToken(Long keyID) throws Exception {
        String response = mockMvc.perform(post("/physical-tokens")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(java.util.Map.of(
                                "tokenName", "Prototype token",
                                "serialNumber", "TOKEN-DEMO-001",
                                "encryptionKeyID", keyID
                        ))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.ownerID").value(premiumUser.getUserID()))
                .andExpect(jsonPath("$.encryptionKeyID").value(keyID))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("tokenID").asLong();
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
