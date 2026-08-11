package com.stealthsync;

import com.stealthsync.config.RenderDatabaseUrl;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** Spring Boot entry point for the shared StealthSync API. */
@SpringBootApplication
public class StealthSyncApplication {

    public static void main(String[] args) {
        RenderDatabaseUrl.applyFromEnvironment(System.getenv(), System.getProperties());
        SpringApplication.run(StealthSyncApplication.class, args);
    }
}
