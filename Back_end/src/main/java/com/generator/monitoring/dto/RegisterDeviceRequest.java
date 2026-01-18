package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterDeviceRequest {
    private String deviceId;
    private String devicePassword;
    private String name;
    private String location;
}
