package com.stealthsync.service.security;

import com.stealthsync.exception.DeviceAccessDeniedException;
import com.stealthsync.model.dto.UserDeviceDTO;
import com.stealthsync.model.entity.UserAccount;
import com.stealthsync.model.entity.UserDevice;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.repository.UserDeviceRepository;
import com.stealthsync.service.SubscriptionEntitlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
/** Registers customer devices and enforces one free or five active Premium devices. */
public class DeviceRegistrationService {

    public static final String FREE_SECOND_DEVICE_MESSAGE =
            "Multi-device access requires an active premium subscription.";
    public static final String PREMIUM_DEVICE_LIMIT_MESSAGE =
            "Premium accounts can use up to 5 active devices.";

    private final UserDeviceRepository userDeviceRepository;
    private final UserAccountRepository userAccountRepository;
    private final DeviceIdentifierService deviceIdentifierService;
    private final SubscriptionEntitlementService entitlementService;
    private final SecurityAuditService securityAuditService;

    @Transactional
    public UserDevice registerOrValidate(UserAccount user, String rawIdentifier, String deviceName, String platform) {
        if (user == null || !"customer".equalsIgnoreCase(user.getRole())) {
            return null;
        }
        String identifierHash = deviceIdentifierService.requireHash(rawIdentifier);
        boolean premium = entitlementService.hasActivePremium(user);
        List<UserDevice> devices = userDeviceRepository.findByOwnerIDOrderByFirstSeenAtAsc(user.getUserID());
        reconcileEntitlement(devices, premium);

        UserDevice device = userDeviceRepository.findByOwnerIDAndDeviceIdentifierHash(user.getUserID(), identifierHash)
                .orElse(null);
        if (device != null) {
            if (device.getRevokedAt() != null) {
                deny(user.getUserID(), "This device has been revoked.");
            }
            if (!device.isActive()) {
                if (!premium && !device.isPrimaryDevice()) {
                    deny(user.getUserID(), FREE_SECOND_DEVICE_MESSAGE);
                }
                enforceLimit(user.getUserID(), premium);
                device.setActive(true);
            }
            updateMetadata(device, deviceName, platform);
            return userDeviceRepository.save(device);
        }

        enforceLimit(user.getUserID(), premium);
        Instant now = Instant.now();
        UserDevice created = new UserDevice(
                null,
                user.getUserID(),
                identifierHash,
                safeName(deviceName),
                safePlatform(platform),
                now,
                now,
                devices.isEmpty(),
                true,
                null
        );
        UserDevice saved = userDeviceRepository.save(created);
        securityAuditService.recordForUser(user.getUserID(), "DEVICE_REGISTERED", null);
        return saved;
    }

    @Transactional
    public UserDevice requireAccess(Long ownerID, String rawIdentifier) {
        UserAccount user = userAccountRepository.findById(ownerID)
                .orElseThrow(() -> new DeviceAccessDeniedException("Authenticated account is unavailable."));
        String identifierHash;
        try {
            identifierHash = deviceIdentifierService.requireHash(rawIdentifier);
        } catch (IllegalArgumentException exception) {
            deny(ownerID, exception.getMessage());
            return null;
        }

        boolean premium = entitlementService.hasActivePremium(user);
        List<UserDevice> devices = userDeviceRepository.findByOwnerIDOrderByFirstSeenAtAsc(ownerID);
        reconcileEntitlement(devices, premium);
        UserDevice device = userDeviceRepository.findByOwnerIDAndDeviceIdentifierHash(ownerID, identifierHash)
                .orElseThrow(() -> denied(ownerID, "This device is not registered. Sign in again."));
        if (device.getRevokedAt() != null) {
            deny(ownerID, "This device has been revoked.");
        }
        if (!device.isActive()) {
            deny(ownerID, device.isPrimaryDevice()
                    ? "This device is inactive. Sign in again."
                    : FREE_SECOND_DEVICE_MESSAGE);
        }
        device.setLastSeenAt(Instant.now());
        return userDeviceRepository.save(device);
    }

    @Transactional(readOnly = true)
    public List<UserDeviceDTO> list(Long ownerID, String rawIdentifier) {
        String currentHash = deviceIdentifierService.requireHash(rawIdentifier);
        return userDeviceRepository.findByOwnerIDOrderByFirstSeenAtAsc(ownerID).stream()
                .map(device -> toDTO(device, currentHash))
                .toList();
    }

    @Transactional
    public UserDeviceDTO rename(Long ownerID, Long deviceID, String rawIdentifier, String deviceName) {
        UserDevice current = requireAccess(ownerID, rawIdentifier);
        UserDevice target = userDeviceRepository.findByDeviceIDAndOwnerID(deviceID, ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Device was not found."));
        target.setDeviceName(safeName(deviceName));
        return toDTO(userDeviceRepository.save(target), current.getDeviceIdentifierHash());
    }

    @Transactional
    public void revoke(Long ownerID, Long deviceID, String rawIdentifier) {
        UserAccount user = userAccountRepository.findById(ownerID)
                .orElseThrow(() -> new IllegalArgumentException("User was not found."));
        if (!entitlementService.hasActivePremium(user)) {
            throw new DeviceAccessDeniedException("An active premium subscription is required to revoke another device.");
        }
        UserDevice current = requireAccess(ownerID, rawIdentifier);
        UserDevice target = userDeviceRepository.findByDeviceIDAndOwnerID(deviceID, ownerID)
                .orElseThrow(() -> new IllegalArgumentException("Device was not found."));
        if (target.getDeviceID().equals(current.getDeviceID()) || target.isPrimaryDevice()) {
            throw new IllegalArgumentException("The current or primary device cannot be revoked.");
        }
        target.setActive(false);
        target.setRevokedAt(Instant.now());
        userDeviceRepository.save(target);
        securityAuditService.recordForUser(ownerID, "DEVICE_REVOKED", null);
    }

    private void reconcileEntitlement(List<UserDevice> devices, boolean premium) {
        if (premium) {
            return;
        }
        devices.stream()
                .filter(device -> !device.isPrimaryDevice() && device.isActive())
                .forEach(device -> {
                    device.setActive(false);
                    userDeviceRepository.save(device);
                });
    }

    private void enforceLimit(Long ownerID, boolean premium) {
        long activeCount = userDeviceRepository.countByOwnerIDAndActiveTrueAndRevokedAtIsNull(ownerID);
        int limit = premium ? 5 : 1;
        if (activeCount >= limit) {
            deny(ownerID, premium ? PREMIUM_DEVICE_LIMIT_MESSAGE : FREE_SECOND_DEVICE_MESSAGE);
        }
    }

    private void updateMetadata(UserDevice device, String deviceName, String platform) {
        if (deviceName != null && !deviceName.isBlank()) {
            device.setDeviceName(safeName(deviceName));
        }
        if (platform != null && !platform.isBlank()) {
            device.setPlatform(safePlatform(platform));
        }
        device.setLastSeenAt(Instant.now());
    }

    private String safeName(String value) {
        String name = value == null || value.isBlank() ? "Windows device" : value.trim();
        return name.substring(0, Math.min(name.length(), 120));
    }

    private String safePlatform(String value) {
        String platform = value == null || value.isBlank() ? "Windows" : value.trim();
        return platform.substring(0, Math.min(platform.length(), 80));
    }

    private UserDeviceDTO toDTO(UserDevice device, String currentHash) {
        return new UserDeviceDTO(
                device.getDeviceID(),
                device.getOwnerID(),
                device.getDeviceName(),
                device.getPlatform(),
                device.getFirstSeenAt(),
                device.getLastSeenAt(),
                device.isPrimaryDevice(),
                device.isActive(),
                device.getRevokedAt(),
                device.getDeviceIdentifierHash().equals(currentHash)
        );
    }

    private DeviceAccessDeniedException denied(Long ownerID, String message) {
        securityAuditService.recordForUser(ownerID, "DEVICE_ACCESS_DENIED", null);
        return new DeviceAccessDeniedException(message);
    }

    private void deny(Long ownerID, String message) {
        throw denied(ownerID, message);
    }
}
