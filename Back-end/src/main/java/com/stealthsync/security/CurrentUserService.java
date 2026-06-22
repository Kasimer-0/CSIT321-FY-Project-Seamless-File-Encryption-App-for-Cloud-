package com.stealthsync.security;

import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.repository.UserAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
/** Resolves the authenticated account from the JWT subject instead of request parameters. */
public class CurrentUserService {

    private final UserAccountRepository userAccountRepository;

    public Long requireUserID() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || "anonymousUser".equals(authentication.getPrincipal())) {
            throw new IllegalStateException("An authenticated user is required.");
        }
        return Long.parseLong(authentication.getName());
    }

    public UserAccount requireUser() {
        return userAccountRepository.findById(requireUserID())
                .filter(user -> !user.isSuspended())
                .orElseThrow(() -> new IllegalStateException("Authenticated account is unavailable."));
    }
}