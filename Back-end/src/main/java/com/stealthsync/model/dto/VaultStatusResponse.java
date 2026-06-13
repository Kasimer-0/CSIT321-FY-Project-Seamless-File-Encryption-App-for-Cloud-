package com.stealthsync.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
/** Public vault state that reveals initialization/unlock status but never key material. */
public class VaultStatusResponse {
    private boolean created;
    private boolean unlocked;
}
