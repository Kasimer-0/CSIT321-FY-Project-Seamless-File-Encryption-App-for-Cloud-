package com.stealthsync.integration;

import com.stealthsync.controller.CloudStorageController;
import com.stealthsync.model.dto.CloudFileDTO;
import com.stealthsync.model.entity.CloudStorageLink;
import com.stealthsync.model.entity.Plan;
import com.stealthsync.model.entity.Subscription;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.AppDataService;
import com.stealthsync.service.cloud.CloudCiphertextService;
import com.stealthsync.service.cloud.CloudStorageAdapter;
import com.stealthsync.service.cloud.EncryptedEnvelopeV2Inspector;
import com.stealthsync.service.crypto.AesGcmService;
import com.stealthsync.service.crypto.EncryptionKeyService;
import com.stealthsync.service.crypto.EncryptionPolicyService;
import com.stealthsync.service.crypto.UserVaultService;
import com.stealthsync.service.security.DeviceIdentifierService;
import com.stealthsync.service.security.DeviceRegistrationService;
import com.stealthsync.service.security.SecurityAuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:multi-device-v2-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "stealthsync.jwt.secret=multi-device-v2-signing-secret"
})
@Transactional
class MultiDeviceV2IntegrationTest {

    @Autowired private UserAccountRepository userRepository;
    @Autowired private PlanRepository planRepository;
    @Autowired private SubscriptionRepository subscriptionRepository;
    @Autowired private DeviceRegistrationService deviceService;
    @Autowired private EncryptionKeyService keyService;
    @Autowired private EncryptionPolicyService policyService;
    @Autowired private AppDataService dataStore;
    @Autowired private EncryptedEnvelopeV2Inspector inspector;
    @Autowired private CloudCiphertextService ciphertextService;

    @Test
    void premiumDevicesShareKeyMetadataAndProviderCiphertextWithoutADevicePackage() throws Exception {
        UserAccount owner = premiumOwner();
        deviceService.registerOrValidate(owner, "device-a", "Computer A", "Windows");
        deviceService.registerOrValidate(owner, "device-b", "Computer B", "Windows");
        keyService.createClientDerivedKey(
                owner.getUserID(), "Cross-device key", "AES-256-GCM",
                "AAAAAAAAAAAAAAAAAAAAAA", "ABCDEFGHIJKLMNOP",
                "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                EncryptionKeyService.KEY_SCHEME_V2, 310_000, 2);
        dataStore.linkCloudProvider("dropbox", owner.getUserID(), "shared@example.test");

        CurrentUserService currentUser = mock(CurrentUserService.class);
        when(currentUser.requireUserID()).thenReturn(owner.getUserID());
        InMemoryProvider provider = new InMemoryProvider(inspector);
        CloudStorageController controller = new CloudStorageController(
                dataStore,
                List.of(provider),
                mock(AesGcmService.class),
                currentUser,
                mock(UserVaultService.class),
                policyService,
                keyService,
                mock(SecurityAuditService.class),
                mock(DeviceIdentifierService.class),
                inspector,
                ciphertextService);

        byte[] uploadedByA = envelope("AES-256-GCM", "ABCDEFGHIJKLMNOP", "payload-a");
        String objectA = "stealthsync-11111111-1111-4111-8111-111111111111.ssenc";
        CloudFileDTO fileA = controller.uploadCiphertext("dropbox",
                multipart(objectA, uploadedByA), Map.of("objectName", objectA, "plaintextSize", "9")).getBody();

        assertEquals(1, controller.providerFiles("dropbox").getBody().size());
        assertArrayEquals(uploadedByA,
                controller.downloadCiphertext("dropbox", fileA.fileId()).getBody());

        byte[] uploadedByB = envelope("AES-256-GCM", "ABCDEFGHIJKLMNOP", "payload-b");
        String objectB = "stealthsync-22222222-2222-4222-8222-222222222222.ssenc";
        controller.uploadCiphertext("dropbox",
                multipart(objectB, uploadedByB), Map.of("objectName", objectB, "plaintextSize", "9"));

        assertEquals(2, controller.providerFiles("dropbox").getBody().size());
        assertEquals(1, keyService.listKeys(owner.getUserID()).size());
    }

    private UserAccount premiumOwner() {
        Plan plan = planRepository.save(new Plan(
                null, "Premium Multi-device", 15.0, "test", "active", "AES-256-GCM"));
        UserAccount owner = new UserAccount(
                null, "multi-device-owner", "multi-device@example.test", "customer", true, false, null);
        owner.setPasswordHash("test-password-hash");
        owner = userRepository.save(owner);
        subscriptionRepository.save(new Subscription(
                null, plan, owner, "active", LocalDate.now(), LocalDate.now().plusDays(30)));
        return owner;
    }

    private MockMultipartFile multipart(String objectName, byte[] bytes) {
        return new MockMultipartFile(
                "file", objectName, "application/vnd.stealthsync.encrypted", bytes);
    }

    private byte[] envelope(String algorithm, String fingerprint, String content) {
        String iv = "AAAAAAAAAAAAAAAA";
        String encryptedMetadata = "AAAAAAAAAAAAAAAAAAAAAAAA";
        String header = "{\"version\":2,\"algorithm\":\"" + algorithm
                + "\",\"keyFingerprint\":\"" + fingerprint
                + "\",\"iv\":\"" + iv
                + "\",\"metadataIv\":\"" + iv
                + "\",\"encryptedMetadata\":\"" + encryptedMetadata + "\"}";
        byte[] magic = new byte[]{0x53, 0x53, 0x45, 0x4e, 0x43, 0x56, 0x32, 0x00};
        byte[] headerBytes = header.getBytes(StandardCharsets.UTF_8);
        byte[] ciphertext = Arrays.copyOf(content.getBytes(StandardCharsets.UTF_8), 16);
        return ByteBuffer.allocate(magic.length + 4 + headerBytes.length + ciphertext.length)
                .put(magic).putInt(headerBytes.length).put(headerBytes).put(ciphertext).array();
    }

    private static final class InMemoryProvider implements CloudStorageAdapter {
        private final EncryptedEnvelopeV2Inspector inspector;
        private final Map<String, StoredObject> objects = new LinkedHashMap<>();

        private InMemoryProvider(EncryptedEnvelopeV2Inspector inspector) {
            this.inspector = inspector;
        }

        @Override public String providerKey() { return "dropbox"; }
        @Override public String providerPath() { return "dropbox"; }
        @Override public String providerLabel() { return "Dropbox"; }
        @Override public boolean isConfigured() { return true; }
        @Override public boolean isConnected(Long ownerID) { return true; }
        @Override public String createAuthorizationUrl(Long ownerID, String deviceIdentifierHash) { throw new UnsupportedOperationException(); }
        @Override public CloudStorageLink completeAuthorization(String code, String state) { throw new UnsupportedOperationException(); }
        @Override public List<CloudFileDTO> listEncryptedFilesForProvider(Long ownerID) {
            List<CloudFileDTO> files = new ArrayList<>();
            objects.forEach((id, stored) -> {
                var header = inspector.inspect(stored.bytes());
                files.add(new CloudFileDTO(
                        providerKey(), id, stored.objectName(), null, stored.bytes().length,
                        stored.createdAt(), stored.createdAt(), header.algorithm(), null, null,
                        header.keyFingerprint(), 2, header.encryptedMetadata()));
            });
            return files;
        }
        @Override public CloudFileDTO uploadEncryptedForProvider(Long ownerID, CloudUploadMetadata metadata, InputStream encryptedContent) { throw new UnsupportedOperationException(); }
        @Override public DownloadedCloudFile downloadEncryptedForProvider(Long ownerID, String fileId) { throw new UnsupportedOperationException(); }
        @Override public CloudFileDTO uploadCiphertextForProvider(Long ownerID, CiphertextUploadMetadata metadata, InputStream ciphertext) throws Exception {
            String id = "remote-" + (objects.size() + 1);
            byte[] bytes = ciphertext.readAllBytes();
            Instant now = Instant.now();
            objects.put(id, new StoredObject(metadata.objectName(), bytes, now));
            return new CloudFileDTO(providerKey(), id, metadata.objectName(), null, bytes.length,
                    now, now, metadata.algorithm(), null, null, metadata.keyFingerprint(), 2, metadata.encryptedMetadata());
        }
        @Override public DownloadedCiphertext downloadCiphertextForProvider(Long ownerID, String fileId) {
            StoredObject stored = objects.get(fileId);
            return new DownloadedCiphertext(stored.objectName(), stored.bytes());
        }
        @Override public void deleteEncryptedFileForProvider(Long ownerID, String fileId) { objects.remove(fileId); }
        @Override public void disconnect(Long ownerID) { }

        private record StoredObject(String objectName, byte[] bytes, Instant createdAt) { }
    }
}
