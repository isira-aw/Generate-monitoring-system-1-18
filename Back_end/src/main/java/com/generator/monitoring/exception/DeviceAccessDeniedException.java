package com.generator.monitoring.exception;

public class DeviceAccessDeniedException extends RuntimeException {
    public DeviceAccessDeniedException(String message) {
        super(message);
    }
}
