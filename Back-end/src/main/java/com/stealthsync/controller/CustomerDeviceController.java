package com.stealthsync.controller;

import com.stealthsync.model.dto.UserDeviceDTO;
import com.stealthsync.security.CurrentUserService;
import com.stealthsync.service.security.DeviceIdentifierService;
import com.stealthsync.service.security.DeviceRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/devices")
@RequiredArgsConstructor
/** Owner-scoped customer API for viewing, renaming, revoking, and restoring registered devices. */
public class CustomerDeviceController {

    private final CurrentUserService currentUserService;
    private final DeviceRegistrationService deviceRegistrationService;

    @GetMapping
    public ResponseEntity<List<UserDeviceDTO>> list(
            @RequestHeader(DeviceIdentifierService.HEADER_NAME) String rawDeviceID) {
        return ResponseEntity.ok(deviceRegistrationService.list(
                currentUserService.requireUserID(), rawDeviceID));
    }

    @PostMapping("/register")
    public ResponseEntity<UserDeviceDTO> register(
            @RequestHeader(DeviceIdentifierService.HEADER_NAME) String rawDeviceID,
            @RequestBody(required = false) Map<String, Object> request) {
        var user = currentUserService.requireUser();
        var device = deviceRegistrationService.registerOrValidate(
                user,
                rawDeviceID,
                asString(request, "deviceName"),
                asString(request, "platform")
        );
        return ResponseEntity.ok(deviceRegistrationService.list(user.getUserID(), rawDeviceID).stream()
                .filter(item -> item.deviceID().equals(device.getDeviceID()))
                .findFirst()
                .orElseThrow());
    }

    @PatchMapping("/{deviceID}/rename")
    public ResponseEntity<UserDeviceDTO> rename(
            @PathVariable Long deviceID,
            @RequestHeader(DeviceIdentifierService.HEADER_NAME) String rawDeviceID,
            @RequestBody Map<String, Object> request) {
        return ResponseEntity.ok(deviceRegistrationService.rename(
                currentUserService.requireUserID(), deviceID, rawDeviceID, asString(request, "deviceName")));
    }

    @DeleteMapping("/{deviceID}")
    public ResponseEntity<Void> revoke(
            @PathVariable Long deviceID,
            @RequestHeader(DeviceIdentifierService.HEADER_NAME) String rawDeviceID) {
        deviceRegistrationService.revoke(currentUserService.requireUserID(), deviceID, rawDeviceID);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{deviceID}/restore")
    public ResponseEntity<Void> restore(
            @PathVariable Long deviceID,
            @RequestHeader(DeviceIdentifierService.HEADER_NAME) String rawDeviceID) {
        deviceRegistrationService.restore(currentUserService.requireUserID(), deviceID, rawDeviceID);
        return ResponseEntity.noContent().build();
    }

    private String asString(Map<String, Object> request, String key) {
        if (request != null && request.get(key) instanceof String value) {
            return value;
        }
        return null;
    }
}
