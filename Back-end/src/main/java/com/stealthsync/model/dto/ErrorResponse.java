package com.stealthsync.model.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
/** Consistent API error payload returned by the global exception handler. */
public class ErrorResponse {
    private String message; // message for front-end integration
}
