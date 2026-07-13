package com.stealthsync.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.EncryptedFileRecord;
import com.stealthsync.model.entity.EncryptionKeyRecord;
import com.stealthsync.model.entity.PhysicalTokenRecord;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.EncryptionKeyRepository;
import com.stealthsync.repository.PhysicalTokenRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.service.crypto.EncryptionKeyService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
    private PhysicalTokenRepository physicalTokenRepository;

    @Autowired
    private EncryptionKeyService encryptionKeyService;

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
    void freeCustomerCannotCreateAes256EncryptionKey() throws Exception {
        mockMvc.perform(post("/encryption-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyName":"Blocked premium key","algorithm":"AES-256-GCM","keyPassword":"Master@12345"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("AES-256-GCM requires an active premium subscription."));
    }

    @Test
    void createEncryptionKeyDoesNotReturnSensitiveMaterialAndCanBeListed() throws Exception {
        mockMvc.perform(post("/encryption-keys")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyName":"Demo key","algorithm":"AES-128","keyPassword":"Master@12345"}
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

    @Test
    void customerCanRenameActivateDeactivateAndDeleteOwnEncryptionKey() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(customerA.getUserID(), "Original key", "AES-128", "Master@12345");

        mockMvc.perform(patch("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"keyName\":\"Renamed key\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.keyName").value("Renamed key"));

        mockMvc.perform(patch("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"inactive\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("inactive"));

        mockMvc.perform(patch("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"active\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("active"));

        mockMvc.perform(delete("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("retired"))
                .andExpect(jsonPath("$.salt").doesNotExist())
                .andExpect(jsonPath("$.passwordVerifier").doesNotExist());
    }

    @Test
    void encryptionKeyAlgorithmCannotBeChangedAfterCreation() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(customerA.getUserID(), "Immutable algorithm", "AES-128", "Master@12345");

        mockMvc.perform(patch("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"algorithm\":\"AES-256-GCM\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Encryption key algorithm cannot be changed after creation."));

        assertEquals("AES-128", encryptionKeyRepository.findById(key.getKeyID()).orElseThrow().getAlgorithm());
    }

    @Test
    void encryptionKeyRenameRejectsEmptyName() throws Exception {
        EncryptionKeyRecord key = encryptionKeyService.createKey(customerA.getUserID(), "Named key", "AES-128", "Master@12345");

        mockMvc.perform(patch("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"keyName\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Encryption key name cannot be empty."));
    }

    @Test
    void protectedApiWithoutTokenReturnsUnauthorized() throws Exception {
        mockMvc.perform(get("/me"))
                .andExpect(status().isUnauthorized());
    }


    @Test
    void customerCannotDeleteAnotherCustomersCloudLink() throws Exception {
        CloudStorageLink link = cloudStorageLinkRepository.save(new CloudStorageLink(
                null,
                "dropbox",
                "other@example.test",
                Instant.now(),
                "connected",
                false,
                customerB.getUserID()
        ));

        mockMvc.perform(delete("/cloud-storage/links/{id}", link.getLinkID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());

        assertTrue(cloudStorageLinkRepository.findById(link.getLinkID()).isPresent());
    }

    @Test
    void customerCannotModifyAnotherCustomersEncryptionKey() throws Exception {
        EncryptionKeyRecord key = createCustomerBKey("Other editable key");

        mockMvc.perform(patch("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"keyName":"Tampered name","status":"inactive"}
                                """))
                .andExpect(status().isNotFound());

        EncryptionKeyRecord unchanged = encryptionKeyRepository.findById(key.getKeyID()).orElseThrow();
        assertEquals("Other editable key", unchanged.getKeyName());
        assertEquals("active", unchanged.getStatus());
    }

    @Test
    void customerCannotDeleteAnotherCustomersEncryptionKey() throws Exception {
        EncryptionKeyRecord key = createCustomerBKey("Other delete key");

        mockMvc.perform(delete("/encryption-keys/{id}", key.getKeyID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());

        assertTrue(encryptionKeyRepository.findById(key.getKeyID()).isPresent());
    }

    @Test
    void premiumCustomerCannotReadAnotherCustomersPhysicalToken() throws Exception {
        makeCustomerAPremium();
        PhysicalTokenRecord token = createCustomerBToken("Other token", "TOKEN-B-READ");

        mockMvc.perform(get("/physical-tokens/{id}", token.getTokenID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());
    }

    @Test
    void premiumCustomerCannotChangeAnotherCustomersPhysicalTokenLifecycle() throws Exception {
        makeCustomerAPremium();
        PhysicalTokenRecord token = createCustomerBToken("Other lifecycle token", "TOKEN-B-LIFE");

        mockMvc.perform(patch("/physical-tokens/{id}/activate", token.getTokenID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());
        mockMvc.perform(patch("/physical-tokens/{id}/deactivate", token.getTokenID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/physical-tokens/{id}", token.getTokenID())
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isNotFound());

        PhysicalTokenRecord unchanged = physicalTokenRepository.findById(token.getTokenID()).orElseThrow();
        assertEquals("inactive", unchanged.getStatus());
    }

    @Test
    void customerCannotEncryptLocalFileWithAnotherCustomersKeyID() throws Exception {
        EncryptionKeyRecord otherKey = createCustomerBKey("Other upload key");
        int fileCountBefore = encryptedFileRecordRepository
                .findByOwnerIDOrderByUploadedAtDesc(customerA.getUserID())
                .size();

        mockMvc.perform(multipart("/files/encrypt-upload")
                        .file(new MockMultipartFile("file", "note.txt", MediaType.TEXT_PLAIN_VALUE, "secret".getBytes()))
                        .param("keyID", otherKey.getKeyID().toString())
                        .param("keyPassword", "OtherKey@12345")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isBadRequest());

        int fileCountAfter = encryptedFileRecordRepository
                .findByOwnerIDOrderByUploadedAtDesc(customerA.getUserID())
                .size();
        assertEquals(fileCountBefore, fileCountAfter);
    }

    @Test
    void localFileEncryptUploadRequiresKeyIDAndKeyPassword() throws Exception {
        mockMvc.perform(multipart("/files/encrypt-upload")
                        .file(new MockMultipartFile("file", "missing-key.txt", MediaType.TEXT_PLAIN_VALUE, "secret".getBytes()))
                        .param("keyPassword", "Master@12345")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(multipart("/files/encrypt-upload")
                        .file(new MockMultipartFile("file", "missing-password.txt", MediaType.TEXT_PLAIN_VALUE, "secret".getBytes()))
                        .param("keyID", "1")
                        .header(HttpHeaders.AUTHORIZATION, bearer(customerAToken)))
                .andExpect(status().isBadRequest());
    }

    private EncryptionKeyRecord createCustomerBKey(String keyName) {
        return encryptionKeyService.createKey(customerB.getUserID(), keyName, "AES-128", "OtherKey@12345");
    }

    private PhysicalTokenRecord createCustomerBToken(String tokenName, String serialNumber) {
        return physicalTokenRepository.save(new PhysicalTokenRecord(
                null,
                customerB.getUserID(),
                null,
                tokenName,
                serialNumber,
                "inactive",
                Instant.now(),
                null
        ));
    }

    private void makeCustomerAPremium() {
        customerA.setSubscribed(true);
        customerA = userAccountRepository.save(customerA);
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }
}
