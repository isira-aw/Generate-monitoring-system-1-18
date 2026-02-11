package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminAuthResponse {
    private String message;
    private String token;
    private AdminDto admin;
}
