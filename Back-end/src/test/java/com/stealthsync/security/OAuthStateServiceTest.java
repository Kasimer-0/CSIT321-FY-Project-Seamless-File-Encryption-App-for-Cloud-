package com.stealthsync.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OAuthStateServiceTest {

    @Test
    void signedStateBindsOwnerProviderDeviceAndIsOneTime() {
        OAuthStateService service = new OAuthStateService(new ObjectMapper(), "oauth-test-secret", 600);
        String state = service.issue(42L, "dropbox", "device-hash-a");

        OAuthStateService.OAuthState decoded = service.consume(state, "dropbox");

        assertEquals(42L, decoded.ownerID());
        assertEquals("dropbox", decoded.provider());
        assertEquals("device-hash-a", decoded.deviceIdentifierHash());
        IllegalArgumentException replay = assertThrows(
                IllegalArgumentException.class, () -> service.consume(state, "dropbox"));
        assertEquals("OAuth state has already been used.", replay.getMessage());
    }

    @Test
    void tamperedStateAndWrongProviderAreRejected() {
        OAuthStateService service = new OAuthStateService(new ObjectMapper(), "oauth-test-secret", 600);
        String state = service.issue(42L, "onedrive", "device-hash-a");
        String tampered = (state.charAt(0) == 'A' ? "B" : "A") + state.substring(1);

        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service.consume(tampered, "onedrive")).getMessage().contains("signature"));
        assertTrue(assertThrows(IllegalArgumentException.class,
                () -> service.consume(state, "dropbox")).getMessage().contains("provider"));
    }

    @Test
    void expiredStateIsRejected() {
        OAuthStateService service = new OAuthStateService(new ObjectMapper(), "oauth-test-secret", -1);
        String state = service.issue(42L, "google_drive", "device-hash-a");

        assertEquals("OAuth state has expired.", assertThrows(IllegalArgumentException.class,
                () -> service.consume(state, "google_drive")).getMessage());
    }
}
