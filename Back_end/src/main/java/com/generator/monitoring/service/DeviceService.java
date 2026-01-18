package com.generator.monitoring.service;

import com.generator.monitoring.dto.DeviceDto;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.User;
import com.generator.monitoring.exception.*;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DeviceService {

    private static final Logger logger = LoggerFactory.getLogger(DeviceService.class);

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ThresholdService thresholdService;

    public List<DeviceDto> getAllDevices() {
        return deviceRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DeviceDto> getUserDevices(String userEmail) {
        logger.info("Fetching devices for user: {}", userEmail);

        if (userEmail == null || userEmail.trim().isEmpty()) {
            throw new InvalidInputException("User email cannot be empty");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + userEmail));

        List<DeviceDto> devices = deviceRepository.findByUserId(user.getId()).stream()
                .map(this::mapToDto)
                .toList();

        logger.info("Found {} devices for user: {}", devices.size(), userEmail);
        return devices;
    }

    @Transactional
    public DeviceDto attachDeviceToUser(String deviceId, String devicePassword, String userEmail) {
        logger.info("Starting device attachment process - Device: {}, User: {}", deviceId, userEmail);

        // Input validation
        if (deviceId == null || deviceId.trim().isEmpty()) {
            logger.error("Attachment failed: Device ID is empty");
            throw new InvalidInputException("Device ID cannot be empty");
        }

        if (devicePassword == null || devicePassword.trim().isEmpty()) {
            logger.error("Attachment failed: Device password is empty");
            throw new InvalidInputException("Device password cannot be empty");
        }

        if (userEmail == null || userEmail.trim().isEmpty()) {
            logger.error("Attachment failed: User email is empty");
            throw new InvalidInputException("User email cannot be empty");
        }

        // Trim inputs and make them final for lambda expressions
        final String finalDeviceId = deviceId.trim();
        final String finalDevicePassword = devicePassword.trim();
        final String finalUserEmail = userEmail.trim();

        // Find the device
        Device device = deviceRepository.findByDeviceId(finalDeviceId)
                .orElseThrow(() -> {
                    logger.error("Device not found: {}", finalDeviceId);
                    return new DeviceNotFoundException("Device not found with ID: " + finalDeviceId);
                });

        // Validate device password
        if (device.getDevicePassword() == null || device.getDevicePassword().trim().isEmpty()) {
            logger.error("Device {} has no password set. Device must be registered with a password first.", finalDeviceId);
            throw new InvalidDevicePasswordException("Device password is not configured. Please contact device administrator.");
        }

        if (!device.getDevicePassword().equals(finalDevicePassword)) {
            logger.error("Invalid password provided for device: {}", finalDeviceId);
            throw new InvalidDevicePasswordException("Invalid device password");
        }

        // Find the user
        User user = userRepository.findByEmail(finalUserEmail)
                .orElseThrow(() -> {
                    logger.error("User not found: {}", finalUserEmail);
                    return new UserNotFoundException("User not found: " + finalUserEmail);
                });

        // Check if user is already attached to this device
        boolean alreadyAttached = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (alreadyAttached) {
            logger.warn("Device {} is already attached to user {}", finalDeviceId, finalUserEmail);
            throw new DeviceAlreadyAttachedException("This device is already attached to your account");
        }

        // Attach user to device
        device.getUsers().add(user);
        Device savedDevice = deviceRepository.save(device);

        logger.info("Successfully attached device {} to user {}", finalDeviceId, finalUserEmail);

        return mapToDto(savedDevice);
    }

    @Transactional
    public DeviceDto registerDevice(String deviceId, String devicePassword, String name, String location) {
        logger.info("Registering new device: {}", deviceId);

        // Input validation
        if (deviceId == null || deviceId.trim().isEmpty()) {
            logger.error("Device registration failed: Device ID is empty");
            throw new InvalidInputException("Device ID cannot be empty");
        }

        if (devicePassword == null || devicePassword.trim().isEmpty()) {
            logger.error("Device registration failed: Device password is empty");
            throw new InvalidInputException("Device password cannot be empty");
        }

        if (name == null || name.trim().isEmpty()) {
            logger.error("Device registration failed: Device name is empty");
            throw new InvalidInputException("Device name cannot be empty");
        }

        if (location == null || location.trim().isEmpty()) {
            logger.error("Device registration failed: Device location is empty");
            throw new InvalidInputException("Device location cannot be empty");
        }

        // Trim inputs and make them final
        final String finalDeviceId = deviceId.trim();
        final String finalDevicePassword = devicePassword.trim();
        final String finalName = name.trim();
        final String finalLocation = location.trim();

        // Check if device already exists
        if (deviceRepository.existsByDeviceId(finalDeviceId)) {
            logger.error("Device already exists: {}", finalDeviceId);
            throw new InvalidInputException("Device with ID '" + finalDeviceId + "' already exists");
        }

        // Create device
        Device device = new Device();
        device.setDeviceId(finalDeviceId);
        device.setDevicePassword(finalDevicePassword);
        device.setName(finalName);
        device.setLocation(finalLocation);
        device.setActive(true);

        Device saved = deviceRepository.save(device);

        // Initialize default thresholds
        thresholdService.initializeDefaultThresholds(saved);

        logger.info("Successfully registered device: {}", finalDeviceId);

        return mapToDto(saved);
    }

    @Transactional(readOnly = true)
    public DeviceDto getDeviceByDeviceId(String deviceId) {
        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new InvalidInputException("Device ID cannot be empty");
        }

        Device device = deviceRepository.findByDeviceId(deviceId.trim())
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + deviceId));
        return mapToDto(device);
    }

    @Transactional(readOnly = true)
    public Device getDeviceEntityByDeviceId(String deviceId) {
        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new InvalidInputException("Device ID cannot be empty");
        }

        return deviceRepository.findByDeviceId(deviceId.trim())
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + deviceId));
    }

    @Transactional
    public DeviceDto createDevice(String deviceId, String name, String location) {
        logger.info("Creating device: {}", deviceId);

        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new InvalidInputException("Device ID cannot be empty");
        }

        if (name == null || name.trim().isEmpty()) {
            throw new InvalidInputException("Device name cannot be empty");
        }

        if (location == null || location.trim().isEmpty()) {
            throw new InvalidInputException("Device location cannot be empty");
        }

        final String finalDeviceId = deviceId.trim();
        final String finalName = name.trim();
        final String finalLocation = location.trim();

        if (deviceRepository.existsByDeviceId(finalDeviceId)) {
            logger.error("Device already exists: {}", finalDeviceId);
            throw new InvalidInputException("Device with ID '" + finalDeviceId + "' already exists");
        }

        Device device = new Device();
        device.setDeviceId(finalDeviceId);
        device.setName(finalName);
        device.setLocation(finalLocation);
        device.setActive(true);

        Device saved = deviceRepository.save(device);

        // Initialize default thresholds
        thresholdService.initializeDefaultThresholds(saved);

        logger.info("Successfully created device: {}", finalDeviceId);

        return mapToDto(saved);
    }

    @Transactional
    public DeviceDto updateDevice(String deviceId, String name, String location, Boolean active) {
        logger.info("Updating device: {}", deviceId);

        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new InvalidInputException("Device ID cannot be empty");
        }

        final String finalDeviceId = deviceId.trim();
        Device device = deviceRepository.findByDeviceId(finalDeviceId)
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + finalDeviceId));

        if (name != null && !name.trim().isEmpty()) {
            device.setName(name.trim());
        }
        if (location != null && !location.trim().isEmpty()) {
            device.setLocation(location.trim());
        }
        if (active != null) {
            device.setActive(active);
        }

        Device saved = deviceRepository.save(device);

        logger.info("Successfully updated device: {}", finalDeviceId);

        return mapToDto(saved);
    }

    @Transactional
    public void detachDeviceFromUser(Long deviceId, String userEmail) {
        logger.info("Detaching device ID {} from user: {}", deviceId, userEmail);

        if (deviceId == null) {
            throw new InvalidInputException("Device ID cannot be null");
        }

        if (userEmail == null || userEmail.trim().isEmpty()) {
            throw new InvalidInputException("User email cannot be empty");
        }

        final String finalUserEmail = userEmail.trim();

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + deviceId));

        User user = userRepository.findByEmail(finalUserEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + finalUserEmail));

        // Check if user is attached to this device
        boolean isAttached = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (!isAttached) {
            logger.warn("User {} is not attached to device {}", finalUserEmail, deviceId);
            throw new InvalidInputException("Device is not attached to your account");
        }

        // Remove user from device
        device.getUsers().removeIf(u -> u.getId().equals(user.getId()));
        deviceRepository.save(device);

        logger.info("Successfully detached device {} from user {}", deviceId, finalUserEmail);
    }

    @Transactional
    public void deleteDevice(String deviceId, String userEmail) {
        logger.info("Deleting device: {} by user: {}", deviceId, userEmail);

        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new InvalidInputException("Device ID cannot be empty");
        }

        if (userEmail == null || userEmail.trim().isEmpty()) {
            throw new InvalidInputException("User email cannot be empty");
        }

        final String finalDeviceId = deviceId.trim();
        final String finalUserEmail = userEmail.trim();

        Device device = deviceRepository.findByDeviceId(finalDeviceId)
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + finalDeviceId));

        User user = userRepository.findByEmail(finalUserEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + finalUserEmail));

        // Check if user has access to this device
        boolean hasAccess = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (!hasAccess) {
            logger.error("User {} does not have access to device {}", finalUserEmail, finalDeviceId);
            throw new DeviceAccessDeniedException("You don't have access to delete this device");
        }

        // Delete the device (this will also remove all user associations)
        deviceRepository.delete(device);

        logger.info("Successfully deleted device: {}", finalDeviceId);
    }

    @Transactional
    public DeviceDto updateDeviceInfo(Long deviceId, String name, String location, String userEmail) {
        logger.info("Updating device info for device ID: {} by user: {}", deviceId, userEmail);

        if (deviceId == null) {
            throw new InvalidInputException("Device ID cannot be null");
        }

        if (userEmail == null || userEmail.trim().isEmpty()) {
            throw new InvalidInputException("User email cannot be empty");
        }

        final String finalUserEmail = userEmail.trim();

        Device device = deviceRepository.findById(deviceId)
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + deviceId));

        User user = userRepository.findByEmail(finalUserEmail)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + finalUserEmail));

        // Check if user has access to this device
        boolean hasAccess = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (!hasAccess) {
            logger.error("User {} does not have access to device {}", finalUserEmail, deviceId);
            throw new DeviceAccessDeniedException("You don't have access to edit this device");
        }

        // Update device info
        if (name != null && !name.trim().isEmpty()) {
            device.setName(name.trim());
        }
        if (location != null && !location.trim().isEmpty()) {
            device.setLocation(location.trim());
        }

        Device saved = deviceRepository.save(device);

        logger.info("Successfully updated device info for device ID: {}", deviceId);

        return mapToDto(saved);
    }

    private DeviceDto mapToDto(Device device) {
        return new DeviceDto(
                device.getId(),
                device.getDeviceId(),
                device.getName(),
                device.getLocation(),
                device.getActive(),
                device.getLastSeenAt()
        );
    }
}
