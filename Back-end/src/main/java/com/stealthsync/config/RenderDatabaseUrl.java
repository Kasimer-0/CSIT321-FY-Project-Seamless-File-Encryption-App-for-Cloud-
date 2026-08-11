package com.stealthsync.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;

/** Converts Render's private PostgreSQL URL into Spring JDBC properties without logging credentials. */
public final class RenderDatabaseUrl {

    private RenderDatabaseUrl() {
    }

    public static void applyFromEnvironment(Map<String, String> environment, Properties properties) {
        if (hasText(environment.get("DB_URL")) || hasText(properties.getProperty("spring.datasource.url"))) {
            return;
        }
        String databaseUrl = environment.get("DATABASE_URL");
        if (!hasText(databaseUrl)) {
            return;
        }

        ParsedDatabaseUrl parsed = parse(databaseUrl);
        properties.setProperty("spring.datasource.url", parsed.jdbcUrl());
        if (!hasText(environment.get("DB_USERNAME"))) {
            properties.setProperty("spring.datasource.username", parsed.username());
        }
        if (!hasText(environment.get("DB_PASSWORD"))) {
            properties.setProperty("spring.datasource.password", parsed.password());
        }
    }

    static ParsedDatabaseUrl parse(String value) {
        URI uri;
        try {
            uri = URI.create(value);
        } catch (Exception exception) {
            throw new IllegalArgumentException("DATABASE_URL is not a valid PostgreSQL URL.", exception);
        }
        if (!("postgres".equalsIgnoreCase(uri.getScheme()) || "postgresql".equalsIgnoreCase(uri.getScheme()))
                || uri.getHost() == null || uri.getPath() == null || uri.getPath().length() < 2
                || uri.getUserInfo() == null) {
            throw new IllegalArgumentException("DATABASE_URL must include PostgreSQL host, database, user, and password.");
        }

        String[] credentials = uri.getRawUserInfo().split(":", 2);
        if (credentials.length != 2) {
            throw new IllegalArgumentException("DATABASE_URL must include both database user and password.");
        }
        int port = uri.getPort() < 0 ? 5432 : uri.getPort();
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        String jdbcUrl = "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getRawPath() + query;
        return new ParsedDatabaseUrl(
                jdbcUrl,
                decode(credentials[0]),
                decode(credentials[1])
        );
    }

    private static String decode(String value) {
        // URI user-info uses percent encoding; unlike form data, a literal '+' is not a space.
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    record ParsedDatabaseUrl(String jdbcUrl, String username, String password) {
    }
}
