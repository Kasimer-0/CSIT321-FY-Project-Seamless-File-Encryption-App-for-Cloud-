package com.stealthsync.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VaultStatusResponse {
    private boolean created;
    private boolean unlocked;
}
