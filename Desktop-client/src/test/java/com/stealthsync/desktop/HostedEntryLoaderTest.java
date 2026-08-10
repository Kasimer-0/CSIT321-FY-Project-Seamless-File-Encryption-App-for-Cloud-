package com.stealthsync.desktop;

import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class HostedEntryLoaderTest {

    private static final URI SERVICE = URI.create("https://stealthsync.example/");

    @Test
    void resolvesOnlySameOriginAssetEntries() {
        URI entry = HostedEntryLoader.resolveEntryUri(SERVICE,
                "<script defer src=\"/assets/index-abc123.js\"></script>");

        assertEquals(URI.create("https://stealthsync.example/assets/index-abc123.js"), entry);
    }

    @Test
    void rejectsThirdPartyAndNonAssetEntries() {
        assertThrows(IllegalStateException.class, () -> HostedEntryLoader.resolveEntryUri(SERVICE,
                "<script src=\"https://attacker.example/assets/index.js\"></script>"));
        assertThrows(IllegalStateException.class, () -> HostedEntryLoader.resolveEntryUri(SERVICE,
                "<script src=\"/untrusted/index.js\"></script>"));
    }
}
