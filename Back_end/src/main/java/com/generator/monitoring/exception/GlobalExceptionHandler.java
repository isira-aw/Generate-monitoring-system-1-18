package com.generator.monitoring.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DeviceNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleDeviceNotFoundException(DeviceNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", ex.getMessage(), "error", "DEVICE_NOT_FOUND"));
    }

    @ExceptionHandler(DeviceAlreadyAttachedException.class)
    public ResponseEntity<Map<String, String>> handleDeviceAlreadyAttachedException(DeviceAlreadyAttachedException ex) {
        return ResponseEntity
                .status(HttpStatus.CONFLICT)
                .body(Map.of("message", ex.getMessage(), "error", "DEVICE_ALREADY_ATTACHED"));
    }

    @ExceptionHandler(InvalidDevicePasswordException.class)
    public ResponseEntity<Map<String, String>> handleInvalidDevicePasswordException(InvalidDevicePasswordException ex) {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", ex.getMessage(), "error", "INVALID_PASSWORD"));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<Map<String, String>> handleUserNotFoundException(UserNotFoundException ex) {
        return ResponseEntity
                .status(HttpStatus.NOT_FOUND)
                .body(Map.of("message", ex.getMessage(), "error", "USER_NOT_FOUND"));
    }

    @ExceptionHandler(DeviceAccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleDeviceAccessDeniedException(DeviceAccessDeniedException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of("message", ex.getMessage(), "error", "ACCESS_DENIED"));
    }

    @ExceptionHandler(InvalidInputException.class)
    public ResponseEntity<Map<String, String>> handleInvalidInputException(InvalidInputException ex) {
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body(Map.of("message", ex.getMessage(), "error", "INVALID_INPUT"));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(RuntimeException ex) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", ex.getMessage(), "error", "INTERNAL_ERROR"));
    }
}
