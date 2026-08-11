package com.stealthsync.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.net.URI;
import java.util.Arrays;

/** Reads the exact browser origins allowed to call the shared API. */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    private final String[] allowedOrigins;

    public CorsConfig(@Value("${stealthsync.allowed-origins}") String configuredOrigins) {
        this.allowedOrigins = Arrays.stream(configuredOrigins.split(","))
                .map(String::trim)
                .filter(value -> !value.isBlank())
                .distinct()
                .toArray(String[]::new);
        if (allowedOrigins.length == 0) {
            throw new IllegalArgumentException("At least one STEALTHSYNC_ALLOWED_ORIGINS value is required.");
        }
        Arrays.stream(allowedOrigins).forEach(CorsConfig::requireExactOrigin);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    private static void requireExactOrigin(String origin) {
        if ("*".equals(origin)) {
            throw new IllegalArgumentException("Wildcard CORS origins are not allowed.");
        }
        try {
            URI uri = URI.create(origin);
            if (uri.getScheme() == null || uri.getHost() == null || uri.getUserInfo() != null
                    || uri.getPath() != null && !uri.getPath().isBlank()
                    || uri.getQuery() != null || uri.getFragment() != null) {
                throw new IllegalArgumentException();
            }
        } catch (Exception exception) {
            throw new IllegalArgumentException("CORS entries must be exact URL origins: " + origin);
        }
    }
}
