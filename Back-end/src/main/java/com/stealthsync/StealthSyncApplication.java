package com.stealthsync;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
/** Spring Boot entry point for the shared StealthSync API and hosted frontend. */
public class StealthSyncApplication {

    public static void main(String[] args) {
        SpringApplication.run(StealthSyncApplication.class, args);
    }
}
