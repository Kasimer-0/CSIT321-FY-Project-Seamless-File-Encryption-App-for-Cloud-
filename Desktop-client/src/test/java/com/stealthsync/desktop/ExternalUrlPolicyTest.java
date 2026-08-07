package com.stealthsync.desktop;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ExternalUrlPolicyTest {

    private final ExternalUrlPolicy policy = new ExternalUrlPolicy();

    @Test
    void allowsOnlyOfficialHttpsOAuthHosts() {
        assertTrue(policy.isAllowed("https://accounts.google.com/o/oauth2/v2/auth?client_id=test"));
        assertTrue(policy.isAllowed("https://www.dropbox.com/oauth2/authorize?client_id=test"));
        assertTrue(policy.isAllowed("https://login.microsoftonline.com/common/oauth2/v2.0/authorize"));
        assertFalse(policy.isAllowed("http://accounts.google.com/o/oauth2/v2/auth"));
        assertFalse(policy.isAllowed("https://accounts.google.com.attacker.example/authorize"));
        assertFalse(policy.isAllowed("file:///C:/Windows/System32/cmd.exe"));
    }
}
