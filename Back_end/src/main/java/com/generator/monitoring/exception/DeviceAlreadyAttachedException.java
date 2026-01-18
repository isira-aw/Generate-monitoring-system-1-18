package com.generator.monitoring.exception;

public class DeviceAlreadyAttachedException extends RuntimeException {
    public DeviceAlreadyAttachedException(String message) {
        super(message);
    }
}
