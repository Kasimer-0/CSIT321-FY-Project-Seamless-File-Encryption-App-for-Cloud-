package com.stealthsync.model.dto;

import lombok.Data;

@Data
/** Password body used to initialize or unlock the local encryption vault. */
public class VaultPasswordRequest {
    private String masterPassword;
}
