package com.stealthsync.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.JwtService;
import com.stealthsync.service.security.RecoveryLoginAttemptService;
import com.stealthsync.service.security.RecoveryPhraseService;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:account-security-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/account-security-test-vault",
        "stealthsync.jwt.secret=account-security-test-signing-secret"
})
class AccountSecurityControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private RecoveryPhraseService recoveryPhraseService;

    @Autowired
    private RecoveryLoginAttemptService recoveryLoginAttemptService;

    private UserAccount premiumUser;
    private UserAccount freeUser;
    private String premiumToken;
    private String freeToken;

    @BeforeEach
    void setUp() {
        recoveryLoginAttemptService.clearAll();
        premiumUser = userAccountRepository.findByUsernameIgnoreCase("PremiumUser").orElseThrow();
        premiumUser.setRecoveryPhraseHash(null);
        premiumUser.setSuspended(false);
        premiumUser = userAccountRepository.save(premiumUser);

        freeUser = userAccountRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        freeUser.setRecoveryPhraseHash(null);
        freeUser.setSuspended(false);
        freeUser = userAccountRepository.save(freeUser);

        premiumToken = jwtService.createToken(premiumUser);
        freeToken = jwtService.createToken(freeUser);
    }

    @Test
    void recoveryWordListContainsAtLeast2048UniqueValidatedWordsAndGenerationReturnsSix() {
        assertTrue(recoveryPhraseService.wordCount() >= 2048);
        String generated = recoveryPhraseService.generate();
        assertEquals(6, generated.split("-").length);
        assertEquals(generated, recoveryPhraseService.normalize(generated));
    }

    @Test
    void premiumUserCanGenerateAndCheckRecoveryPhraseStatusWithoutHashLeakage() throws Exception {
        mockMvc.perform(get("/account/recovery-phrase/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(false))
                .andExpect(jsonPath("$.recoveryPhrase").doesNotExist())
                .andExpect(jsonPath("$.recoveryPhraseHash").doesNotExist());

        mockMvc.perform(post("/account/recovery-phrase/generate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recoveryPhrase").isNotEmpty())
                .andExpect(jsonPath("$.recoveryPhraseHash").doesNotExist());

        mockMvc.perform(get("/account/recovery-phrase/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.configured").value(true))
                .andExpect(jsonPath("$.recoveryPhraseHash").doesNotExist());
    }

    @Test
    void freeUserCannotGenerateRecoveryPhrase() throws Exception {
        mockMvc.perform(post("/account/recovery-phrase/generate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(freeToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Premium subscription required."));
    }

    @Test
    void generatedRecoveryPhraseLogsInWithHyphensOrSpacesAndReturnsJwt() throws Exception {
        String phrase = generatePhrase();

        assertRecoveryLoginSucceeds(phrase);
        assertRecoveryLoginSucceeds(phrase.replace('-', ' '));
        assertRecoveryLoginSucceeds(phrase.replace("-", "   "));
    }

    @Test
    void wrongAndNonSixWordRecoveryPhrasesAreRejected() throws Exception {
        generatePhrase();

        mockMvc.perform(recoveryLogin("wrong-one-two-three-four-five"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid recovery phrase."));

        mockMvc.perform(recoveryLogin("only-five-words-are-here"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid recovery phrase."));
    }

    @Test
    void recoveryLoginIsTemporarilyLimitedAfterFiveConsecutiveFailures() throws Exception {
        generatePhrase();
        for (int attempt = 0; attempt < 5; attempt++) {
            mockMvc.perform(recoveryLogin("wrong-one-two-three-four-five"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid recovery phrase."));
        }

        mockMvc.perform(recoveryLogin("wrong-one-two-three-four-five"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Too many recovery attempts. Try again later."));
    }

    @Test
    void successfulRecoveryLoginClearsPreviousFailureCount() throws Exception {
        String phrase = generatePhrase();
        for (int attempt = 0; attempt < 4; attempt++) {
            mockMvc.perform(recoveryLogin("wrong-one-two-three-four-five"))
                    .andExpect(status().isBadRequest());
        }
        assertRecoveryLoginSucceeds(phrase);

        for (int attempt = 0; attempt < 4; attempt++) {
            mockMvc.perform(recoveryLogin("wrong-one-two-three-four-five"))
                    .andExpect(status().isBadRequest());
        }
        assertRecoveryLoginSucceeds(phrase);
    }

    @Test
    void suspendedUserCannotLoginWithCorrectRecoveryPhrase() throws Exception {
        String phrase = generatePhrase();
        premiumUser.setSuspended(true);
        userAccountRepository.save(premiumUser);

        mockMvc.perform(recoveryLogin(phrase))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid recovery phrase."));
    }

    @Test
    void configuredPhraseRequiresExplicitRotationConfirmation() throws Exception {
        generatePhrase();

        mockMvc.perform(post("/account/recovery-phrase/generate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Recovery phrase is already configured. Confirm rotation to replace it."));

        mockMvc.perform(post("/account/recovery-phrase/generate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"confirmRotation\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recoveryPhrase").isNotEmpty());
    }

    private String generatePhrase() throws Exception {
        String response = mockMvc.perform(post("/account/recovery-phrase/generate")
                        .header(HttpHeaders.AUTHORIZATION, bearer(premiumToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("recoveryPhrase").asText();
    }

    private void assertRecoveryLoginSucceeds(String phrase) throws Exception {
        mockMvc.perform(recoveryLogin(phrase))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.user.userID").value(premiumUser.getUserID()))
                .andExpect(jsonPath("$.user.recoveryPhraseHash").doesNotExist());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder recoveryLogin(String phrase) throws Exception {
        JsonNode body = objectMapper.valueToTree(java.util.Map.of(
                "usernameOrEmail", premiumUser.getEmail(),
                "recoveryPhrase", phrase
        ));
        return post("/account/recovery-phrase/login")
                .header("X-StealthSync-Device-ID", "account-recovery-device")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsBytes(body));
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
