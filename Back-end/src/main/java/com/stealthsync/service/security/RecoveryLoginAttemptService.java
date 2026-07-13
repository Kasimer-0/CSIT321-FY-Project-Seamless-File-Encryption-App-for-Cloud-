package com.stealthsync.service.security;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Service
/** Applies lightweight in-memory throttling to recovery-phrase login attempts. */
public class RecoveryLoginAttemptService {

    private static final int FAILURE_LIMIT = 5;
    private static final long BLOCK_DURATION_MILLIS = Duration.ofMinutes(5).toMillis();

    private final ConcurrentMap<String, AttemptState> attempts = new ConcurrentHashMap<>();

    public void requireAllowed(String usernameOrEmail, String remoteAddress) {
        String key = attemptKey(usernameOrEmail, remoteAddress);
        AttemptState state = attempts.get(key);
        if (state == null) {
            return;
        }
        long now = System.currentTimeMillis();
        if (state.blockedUntilMillis() > now) {
            throw new IllegalArgumentException("Too many recovery attempts. Try again later.");
        }
        if (state.blockedUntilMillis() > 0) {
            attempts.remove(key, state);
        }
    }

    public void recordFailure(String usernameOrEmail, String remoteAddress) {
        String key = attemptKey(usernameOrEmail, remoteAddress);
        long now = System.currentTimeMillis();
        attempts.compute(key, (ignored, current) -> {
            int failures = current == null || (current.blockedUntilMillis() > 0 && current.blockedUntilMillis() <= now)
                    ? 1
                    : current.failureCount() + 1;
            long blockedUntil = failures >= FAILURE_LIMIT ? now + BLOCK_DURATION_MILLIS : 0;
            return new AttemptState(failures, blockedUntil);
        });
    }

    public void recordSuccess(String usernameOrEmail, String remoteAddress) {
        attempts.remove(attemptKey(usernameOrEmail, remoteAddress));
    }

    public void clearAll() {
        attempts.clear();
    }

    private String attemptKey(String usernameOrEmail, String remoteAddress) {
        String identity = usernameOrEmail == null ? "" : usernameOrEmail.trim().toLowerCase(Locale.ROOT);
        String address = remoteAddress == null ? "unknown" : remoteAddress.trim();
        return identity + "|" + address;
    }

    private record AttemptState(int failureCount, long blockedUntilMillis) {
    }
}
