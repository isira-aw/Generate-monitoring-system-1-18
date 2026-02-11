package com.generator.monitoring.service;

import com.generator.monitoring.dto.AdminDto;
import com.generator.monitoring.dto.CreateAdminRequest;
import com.generator.monitoring.entity.Admin;
import com.generator.monitoring.repository.AdminRepository;
import com.generator.monitoring.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AdminService {

    private static final Logger logger = LoggerFactory.getLogger(AdminService.class);

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public String login(String email, String password) {
        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        if (!passwordEncoder.matches(password, admin.getPassword())) {
            throw new RuntimeException("Invalid credentials");
        }

        return jwtUtil.generateToken(admin.getEmail());
    }

    public AdminDto getAdminByEmail(String email) {
        Admin admin = adminRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        return mapToDto(admin);
    }

    public boolean isAdmin(String email) {
        return adminRepository.existsByEmail(email);
    }

    @Transactional
    public AdminDto createAdmin(CreateAdminRequest request) {
        logger.info("Creating new admin: {}", request.getEmail());

        if (adminRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Admin with this email already exists");
        }

        Admin admin = new Admin();
        admin.setEmail(request.getEmail());
        admin.setPassword(passwordEncoder.encode(request.getPassword()));
        admin.setName(request.getName());

        Admin saved = adminRepository.save(admin);
        logger.info("Successfully created admin: {}", saved.getEmail());

        return mapToDto(saved);
    }

    public List<AdminDto> getAllAdmins() {
        return adminRepository.findAll().stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public void deleteAdmin(Long id) {
        Admin admin = adminRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        // Prevent deleting the last admin
        if (adminRepository.count() <= 1) {
            throw new RuntimeException("Cannot delete the last admin");
        }

        adminRepository.delete(admin);
        logger.info("Deleted admin: {}", admin.getEmail());
    }

    private AdminDto mapToDto(Admin admin) {
        return new AdminDto(
                admin.getId(),
                admin.getEmail(),
                admin.getName(),
                admin.getCreatedAt()
        );
    }
}
