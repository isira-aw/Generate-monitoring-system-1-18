package com.generator.monitoring.repository;

import com.generator.monitoring.entity.Device;
import com.generator.monitoring.entity.DeviceThreshold;
import com.generator.monitoring.enums.ThresholdParameter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceThresholdRepository extends JpaRepository<DeviceThreshold, Long> {
    List<DeviceThreshold> findByDevice(Device device);
    Optional<DeviceThreshold> findByDeviceAndParameter(Device device, ThresholdParameter parameter);
}
