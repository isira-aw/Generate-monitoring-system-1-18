package com.generator.monitoring.service;

import com.generator.monitoring.dto.DeviceDto;
import com.generator.monitoring.entity.Device;
import com.generator.monitoring.repository.DeviceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class DeviceService {

    @Autowired
    private DeviceRepository deviceRepository;

    @Autowired
    private ThresholdService thresholdService;

    public List<DeviceDto> getAllDevices() {
        return deviceRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
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
