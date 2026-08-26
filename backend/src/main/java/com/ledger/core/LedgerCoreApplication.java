package com.ledger.core;

import java.math.BigDecimal;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@SpringBootApplication
public class LedgerCoreApplication {

	public static void main(String[] args) {
		// Normalize database connection URL schemes to be compatible with the PostgreSQL JDBC driver.
		// Render/Heroku provide URLs starting with postgresql:// or postgres://, which JDBC does not accept directly.
		String url = System.getenv("SPRING_DATASOURCE_URL");
		if (url != null) {
			if (url.startsWith("postgresql://")) {
				System.setProperty("SPRING_DATASOURCE_URL", "jdbc:" + url);
			} else if (url.startsWith("postgres://")) {
				System.setProperty("SPRING_DATASOURCE_URL", "jdbc:postgresql://" + url.substring("postgres://".length()));
			}
		}

		String dbUrl = System.getenv("DATABASE_URL");
		if (dbUrl != null && System.getProperty("SPRING_DATASOURCE_URL") == null) {
			if (dbUrl.startsWith("postgresql://")) {
				System.setProperty("SPRING_DATASOURCE_URL", "jdbc:" + dbUrl);
			} else if (dbUrl.startsWith("postgres://")) {
				System.setProperty("SPRING_DATASOURCE_URL", "jdbc:postgresql://" + dbUrl.substring("postgres://".length()));
			}
		}

		SpringApplication.run(LedgerCoreApplication.class, args);
	}

	// Pre-seed 3 profiles with initial balances
	@Bean
	    public CommandLineRunner seedData(com.ledger.core.repository.UserRepository userRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                userRepository.save(com.ledger.core.model.User.builder()
                        .username("Alpha Profile")
                        .balance(new BigDecimal("5000.00"))
                        .build());
                userRepository.save(com.ledger.core.model.User.builder()
                        .username("Beta Profile")
                        .balance(new BigDecimal("10000.00"))
                        .build());
                userRepository.save(com.ledger.core.model.User.builder()
                        .username("Gamma Profile")
                        .balance(new BigDecimal("2500.00"))
                        .build());
                System.out.println("Database successfully pre-seeded with profiles.");
            }
        };
    }
    // Configures CORS
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("*")
                        .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                        .allowedHeaders("*");
            }
        };
    }

}
