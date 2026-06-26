package com.stealthsync.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.EncryptionKeyRepository;
import com.stealthsync.repository.UserAccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:security-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.vault.directory=target/security-test-vault",
        "stealthsync.jwt.secret=security-test-signing-secret"
})
@Transactional
/** Verifies that JWT ownership cannot be overridden with another customer's ID. */
class OwnershipSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserAccountRepository userAccountRepository;

    @Autowired
    private CloudStorageLinkRepository cloudStorageLinkRepository;

    @Autowired
    private EncryptedFileRecordRepository encryptedFileRecordRepository;

    @Autowired
    private EncryptionKeyRepository encryptionKeyRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private UserAccount customerA;
    private UserAccount customerB;
    private String customerAToken;

    @BeforeEach
    void setUp() {
        customerA = userAccountRepository.findByUsernameIgnoreCase("testuser").orElseThrow();
        customerB = userAccountRepository.save(new UserAccount(
                null,
                "other-customer",
                "other-customer@stealthsync.test",
                "customer",
                false,
                false,
                null
        ));
        customerB.setPasswordHash(passwordEncoder.encode("Other@123"));
        customerB = userAccountRepository.save(customerB);
        customerAToken = jwtService.createToken(customerA);
    }

    @Test
    void customerCannotListAnotherCustomersCloudLinksByChangingOwnerID() throws Exception {
        cloudStorageLinkRepository.save(new CloudStorageLink(
                null,
                "onedrive",
                "other@example.test",
                Instant.now(),
                "connected",
                true,
                customerB.getUserID()
        ));

        mockMvc.perform(get("/cloud-storage/links")
                        .queryParam("ownerID", customerB.getUserID().toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void customerCannotDownloadAnotherCustomersLocalFile() throws Exception {
        EncryptedFileRecord file = encryptedFileRecordRepository.save(new EncryptedFileRecord(
                null,
                customerB.getUserID(),
                "other-user.txt",
                12,
                "txt",
                Instant.now(),
                "AES-256-GCM",
                5001L,
                new byte[0]
        ));

        mockMvc.perform(get("/files/{id}/decrypt-download", file.getFileID())
                        .queryParam("ownerID", customerB.getUserID().toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void customerCannotReadAnotherCustomersEncryptionKey() throws Exception {
        Instant now = Instant.now();
        EncryptionKeyRecord key = encryptionKeyRepository.save(new EncryptionKeyRecord(
                null,
                customerB.getUserID(),
                "Other user's key",
                "AES-256-GCM",
                "active",
                "OTHER-FINGERPRINT",
                "test-salt",
                "test-verifier",
                "password-derived-v1",
                now,
                now
        ));

        mockMvc.perform(get("/encryption-keys/{id}", key.getKeyID())
                        .queryParam("ownerID", customerB.getUserID().toString())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void loginReturnsTokenThatCanCallMe() throws Exception {
        String loginBody = mockMvc.perform(post("/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"testuser@stealthsync.com","password":"User@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String token = objectMapper.readTree(loginBody).get("token").asText();
        mockMvc.perform(get("/me").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userID").value(customerA.getUserID()));
    }
    @Test
    void authenticatedCustomerCanLoadCurrentAccount() throws Exception {
        mockMvc.perform(get("/me")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userID").value(customerA.getUserID()))
                .andExpect(jsonPath("$.role").value("customer"));
    }

    @Test
    void customerCannotAccessAdminReports() throws Exception {
        mockMvc.perform(get("/admin/reports/performance")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isForbidden());
    }


    @Test
    void createEncryptionKeyRequiresPassword() throws Exception {
        mockMvc.perform(post("/encryption-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyName":"No password key","algorithm":"AES-256-GCM"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Key password is required."));
    }

    @Test
    void createEncryptionKeyDoesNotReturnSensitiveMaterialAndCanBeListed() throws Exception {
        mockMvc.perform(post("/encryption-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyName":"Demo key","algorithm":"AES-256-GCM","keyPassword":"Master@12345"}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.keyName").value("Demo key"))
                .andExpect(jsonPath("$.salt").doesNotExist())
                .andExpect(jsonPath("$.passwordVerifier").doesNotExist());

        mockMvc.perform(get("/encryption-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].keyName").value("Demo key"))
                .andExpect(jsonPath("$[0].salt").doesNotExist())
                .andExpect(jsonPath("$[0].passwordVerifier").doesNotExist());
    }
    private String bearer(String token) {
        return "Bearer " + token;
    }
}