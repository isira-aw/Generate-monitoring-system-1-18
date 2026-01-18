package com.generator.monitoring.service;

import com.generator.monitoring.dto.DeviceDataMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {

    private static final Logger logger = LoggerFactory.getLogger(WebSocketService.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void sendDeviceData(String deviceId, DeviceDataMessage message) {
        String destination = "/topic/device/" + deviceId;
        logger.debug("Sending data to WebSocket destination: {}", destination);
        messagingTemplate.convertAndSend(destination, message);
    }
}
