package com.generator.monitoring.service;

import com.generator.monitoring.dto.DeviceDto;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.User;
import com.generator.monitoring.repository.DeviceRepository;
import com.generator.monitoring.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DeviceService {

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

    public List<DeviceDto> getUserDevices(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));
        return deviceRepository.findByUserId(user.getId()).stream()
                .map(this::mapToDto)
                .toList();
    }

    public DeviceDto attachDeviceToUser(String deviceId, String devicePassword, String userEmail) {
        // Find the device
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        // Check if device is already attached to another user
        if (device.getUser() != null) {
            throw new RuntimeException("Device is already attached to another user");
        }

        // Validate or set device password
        if (device.getDevicePassword() == null) {
            // If device doesn't have a password yet, set it
            device.setDevicePassword(devicePassword);
        } else {
            // If device has a password, validate it
            if (!device.getDevicePassword().equals(devicePassword)) {
                throw new RuntimeException("Invalid device password");
            }
        }

        // Find the user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found: " + userEmail));

        // Attach device to user
        device.setUser(user);
        Device saved = deviceRepository.save(device);

        return mapToDto(saved);
    }

    public DeviceDto getDeviceByDeviceId(String deviceId) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));
        return mapToDto(device);
    }

    public Device getDeviceEntityByDeviceId(String deviceId) {
        return deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));
    }

    public DeviceDto createDevice(String deviceId, String name, String location) {
        if (deviceRepository.existsByDeviceId(deviceId)) {
            throw new RuntimeException("Device already exists: " + deviceId);
        }

        Device device = new Device();
        device.setDeviceId(deviceId);
        device.setName(name);
        device.setLocation(location);
        device.setActive(true);

        Device saved = deviceRepository.save(device);

        // Initialize default thresholds
        thresholdService.initializeDefaultThresholds(saved);

        return mapToDto(saved);
    }

    public DeviceDto updateDevice(String deviceId, String name, String location, Boolean active) {
        Device device = deviceRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new RuntimeException("Device not found: " + deviceId));

        if (name != null) device.setName(name);
        if (location != null) device.setLocation(location);
        if (active != null) device.setActive(active);

        Device saved = deviceRepository.save(device);
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
