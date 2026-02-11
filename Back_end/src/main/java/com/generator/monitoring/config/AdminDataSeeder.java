package com.generator.monitoring.config;

import com.generator.monitoring.entity.Admin;
import com.generator.monitoring.repository.AdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminDataSeeder implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminDataSeeder.class);

    @Autowired
    private AdminRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        String defaultEmail = "isira.aw@gmail.com";
        String defaultPassword = "000000";

        if (!adminRepository.existsByEmail(defaultEmail)) {
            Admin admin = new Admin();
            admin.setEmail(defaultEmail);
            admin.setPassword(passwordEncoder.encode(defaultPassword));
            admin.setName("Super Admin");

            adminRepository.save(admin);
            logger.info("Default admin account created: {}", defaultEmail);
        } else {
            logger.info("Default admin account already exists: {}", defaultEmail);
        }
    }
}
