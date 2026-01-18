package com.generator.monitoring.repository;

import com.generator.monitoring.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DeviceRepository extends JpaRepository<Device, Long> {
    Optional<Device> findByDeviceId(String deviceId);
    boolean existsByDeviceId(String deviceId);

    @Query("SELECT d FROM Device d JOIN d.users u WHERE u.id = :userId")
    List<Device> findByUserId(@Param("userId") Long userId);
}
