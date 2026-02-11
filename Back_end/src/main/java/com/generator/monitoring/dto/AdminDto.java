package com.generator.monitoring.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminDto {
    private Long id;
    private String email;
    private String name;
    private LocalDateTime createdAt;
}
