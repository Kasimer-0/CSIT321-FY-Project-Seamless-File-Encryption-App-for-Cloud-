package com.stealthsync.config;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class CorsConfigTest {

    @Test
    void acceptsExactOrigins() {
        assertDoesNotThrow(() -> new CorsConfig("https://stealthsync-web.onrender.com,http://localhost:5173"));
    }

    @Test
    void rejectsWildcardAndOriginPaths() {
        assertThrows(IllegalArgumentException.class, () -> new CorsConfig("*"));
        assertThrows(IllegalArgumentException.class, () -> new CorsConfig("https://example.com/app"));
    }
}
