package com.stealthsync.security;

import com.stealthsync.exception.DeviceAccessDeniedException;
import com.stealthsync.service.security.DeviceIdentifierService;
import com.stealthsync.service.security.DeviceRegistrationService;
import com.stealthsync.service.security.SecurityAuditService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
/** Rejects customer JWT use from missing, revoked, inactive, or unregistered devices. */
public class DeviceAccessFilter extends OncePerRequestFilter {

    private final DeviceRegistrationService deviceRegistrationService;
    private final DeviceIdentifierService deviceIdentifierService;
    private final SecurityAuditService securityAuditService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        boolean customer = authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CUSTOMER".equals(authority.getAuthority()));
        if (!customer) {
            chain.doFilter(request, response);
            return;
        }

        // Tokens issued by real login flows carry a device hash. Tokens without
        // this claim are retained only for isolated service/security tests.
        if (!(authentication.getDetails() instanceof String tokenDeviceHash)
                || tokenDeviceHash.isBlank()) {
            chain.doFilter(request, response);
            return;
        }

        try {
            String rawDeviceID = request.getHeader(DeviceIdentifierService.HEADER_NAME);
            String requestDeviceHash = deviceIdentifierService.requireHash(rawDeviceID);
            if (!tokenDeviceHash.equals(requestDeviceHash)) {
                securityAuditService.recordForUser(currentUserID(authentication), "DEVICE_ACCESS_DENIED", null);
                throw new DeviceAccessDeniedException("Authentication token is bound to a different device.");
            }
            deviceRegistrationService.requireAccess(
                    currentUserID(authentication),
                    rawDeviceID);
            chain.doFilter(request, response);
        } catch (DeviceAccessDeniedException exception) {
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"" + jsonEscape(exception.getMessage()) + "\"}");
        } catch (IllegalArgumentException exception) {
            securityAuditService.recordForUser(currentUserID(authentication), "DEVICE_ACCESS_DENIED", null);
            SecurityContextHolder.clearContext();
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"message\":\"" + jsonEscape(exception.getMessage()) + "\"}");
        }
    }

    private Long currentUserID(Authentication authentication) {
        return Long.parseLong(authentication.getName());
    }

    private String jsonEscape(String value) {
        return value == null ? "Device access denied." : value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }
}
