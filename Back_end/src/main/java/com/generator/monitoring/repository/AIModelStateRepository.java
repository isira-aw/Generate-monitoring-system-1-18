package com.generator.monitoring.repository;

import com.generator.monitoring.entity.AIModelState;
import com.generator.monitoring.entity.Device;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AIModelStateRepository extends JpaRepository<AIModelState, Long> {

    /**
     * Find model state by device and type
     */
    @Query("SELECT m FROM AIModelState m WHERE m.device = :device AND m.modelType = :type")
    Optional<AIModelState> findByDeviceAndType(
        @Param("device") Device device,
        @Param("type") String type
    );
}
