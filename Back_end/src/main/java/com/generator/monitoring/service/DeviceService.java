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

        // Trim inputs
        deviceId = deviceId.trim();
        devicePassword = devicePassword.trim();
        userEmail = userEmail.trim();

        // Find the device
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> {
                    logger.error("Device not found: {}", deviceId);
                    return new DeviceNotFoundException("Device not found with ID: " + deviceId);
                });

        // Validate device password
        if (device.getDevicePassword() == null || device.getDevicePassword().trim().isEmpty()) {
            logger.error("Device {} has no password set. Device must be registered with a password first.", deviceId);
            throw new InvalidDevicePasswordException("Device password is not configured. Please contact device administrator.");
        }

        if (!device.getDevicePassword().equals(devicePassword)) {
            logger.error("Invalid password provided for device: {}", deviceId);
            throw new InvalidDevicePasswordException("Invalid device password");
        }

        // Find the user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> {
                    logger.error("User not found: {}", userEmail);
                    return new UserNotFoundException("User not found: " + userEmail);
                });

        // Check if user is already attached to this device
        boolean alreadyAttached = device.getUsers().stream()
                .anyMatch(u -> u.getId().equals(user.getId()));

        if (alreadyAttached) {
            logger.warn("Device {} is already attached to user {}", deviceId, userEmail);
            throw new DeviceAlreadyAttachedException("This device is already attached to your account");
        }

        // Attach user to device
        device.getUsers().add(user);
        Device savedDevice = deviceRepository.save(device);

        logger.info("Successfully attached device {} to user {}", deviceId, userEmail);

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

        // Trim inputs
        deviceId = deviceId.trim();
        devicePassword = devicePassword.trim();
        name = name.trim();
        location = location.trim();

        // Check if device already exists
        if (deviceRepository.existsByDeviceId(deviceId)) {
            logger.error("Device already exists: {}", deviceId);
            throw new InvalidInputException("Device with ID '" + deviceId + "' already exists");
        }

        // Create device
        Device device = new Device();
        device.setDeviceId(deviceId);
        device.setDevicePassword(devicePassword);
        device.setName(name);
        device.setLocation(location);
        device.setActive(true);

        Device saved = deviceRepository.save(device);

        // Initialize default thresholds
        thresholdService.initializeDefaultThresholds(saved);

        logger.info("Successfully registered device: {}", deviceId);

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

        deviceId = deviceId.trim();
        name = name.trim();
        location = location.trim();

        if (deviceRepository.existsByDeviceId(deviceId)) {
            logger.error("Device already exists: {}", deviceId);
            throw new InvalidInputException("Device with ID '" + deviceId + "' already exists");
        }

        Device device = new Device();
        device.setDeviceId(deviceId);
        device.setName(name);
        device.setLocation(location);
        device.setActive(true);

        Device saved = deviceRepository.save(device);

        // Initialize default thresholds
        thresholdService.initializeDefaultThresholds(saved);

        logger.info("Successfully created device: {}", deviceId);

        return mapToDto(saved);
    }

    @Transactional
    public DeviceDto updateDevice(String deviceId, String name, String location, Boolean active) {
        logger.info("Updating device: {}", deviceId);

        if (deviceId == null || deviceId.trim().isEmpty()) {
            throw new InvalidInputException("Device ID cannot be empty");
        }

        Device device = deviceRepository.findByDeviceId(deviceId.trim())
                .orElseThrow(() -> new DeviceNotFoundException("Device not found with ID: " + deviceId));

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

        logger.info("Successfully updated device: {}", deviceId);

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
