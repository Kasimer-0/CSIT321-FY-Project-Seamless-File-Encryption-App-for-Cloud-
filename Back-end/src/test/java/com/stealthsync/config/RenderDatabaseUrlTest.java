package com.stealthsync.config;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RenderDatabaseUrlTest {

    @Test
    void convertsRenderConnectionStringWithoutLeakingCredentialsIntoJdbcUrl() {
        Map<String, String> environment = Map.of(
                "DATABASE_URL", "postgresql://render%20user:p%40ss@private-db:5433/stealthsync?sslmode=require"
        );
        Properties properties = new Properties();

        RenderDatabaseUrl.applyFromEnvironment(environment, properties);

        assertEquals(
                "jdbc:postgresql://private-db:5433/stealthsync?sslmode=require",
                properties.getProperty("spring.datasource.url")
        );
        assertEquals("render user", properties.getProperty("spring.datasource.username"));
        assertEquals("p@ss", properties.getProperty("spring.datasource.password"));
        assertFalse(properties.getProperty("spring.datasource.url").contains("p%40ss"));
    }

    @Test
    void explicitDatabaseUrlTakesPrecedence() {
        Map<String, String> environment = new HashMap<>();
        environment.put("DB_URL", "jdbc:postgresql://explicit:5432/db");
        environment.put("DATABASE_URL", "postgresql://user:password@render:5432/db");
        Properties properties = new Properties();

        RenderDatabaseUrl.applyFromEnvironment(environment, properties);

        assertFalse(properties.containsKey("spring.datasource.url"));
    }

    @Test
    void preservesLiteralPlusAndDecodesEscapedCredentials() {
        RenderDatabaseUrl.ParsedDatabaseUrl parsed = RenderDatabaseUrl.parse(
                "postgresql://user%40team:p+a%2Bss@private-db:5432/stealthsync"
        );

        assertEquals("user@team", parsed.username());
        assertEquals("p+a+ss", parsed.password());
    }

    @Test
    void rejectsIncompleteDatabaseUrl() {
        assertThrows(
                IllegalArgumentException.class,
                () -> RenderDatabaseUrl.parse("postgresql://private-db/stealthsync")
        );
    }
}
