package com.generator.monitoring.dto;

import lombok.Data;

@Data
public class VerifyDeviceCodeRequest {
    private String deviceId;
    private String code;
}
