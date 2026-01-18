package com.generator.monitoring.exception;

public class InvalidDevicePasswordException extends RuntimeException {
    public InvalidDevicePasswordException(String message) {
        super(message);
    }
}
