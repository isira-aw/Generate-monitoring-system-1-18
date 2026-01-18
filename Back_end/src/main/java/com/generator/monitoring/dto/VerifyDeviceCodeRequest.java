package com.generator.monitoring.dto;

import lombok.Data;

@Data
public class VerifyDeviceCodeRequest {
    private Long deviceId;
    private String code;
}
