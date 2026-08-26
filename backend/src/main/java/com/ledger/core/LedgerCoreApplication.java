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
		String url = System.getenv("SPRING_DATASOURCE_URL");
		if (url != null) {
			configureDatabase(url);
		} else {
			String dbUrl = System.getenv("DATABASE_URL");
			if (dbUrl != null) {
				configureDatabase(dbUrl);
			}
		}

		SpringApplication.run(LedgerCoreApplication.class, args);
	}

	private static void configureDatabase(String rawUrl) {
		if (rawUrl == null) {
			return;
		}
		// Normalize database connection URL schemes to be compatible with the PostgreSQL JDBC driver.
		// Render/Heroku provide URLs starting with postgresql:// or postgres://, which JDBC does not accept directly.
		if (rawUrl.startsWith("postgresql://") || rawUrl.startsWith("postgres://")) {
			try {
				java.net.URI uri = new java.net.URI(rawUrl);
				String userInfo = uri.getUserInfo();
				String host = uri.getHost();
				int port = uri.getPort();
				String path = uri.getPath();

				String username = null;
				String password = null;
				if (userInfo != null && userInfo.contains(":")) {
					String[] parts = userInfo.split(":", 2);
					username = parts[0];
					password = parts[1];
				}

				String jdbcUrl = "jdbc:postgresql://" + host + (port != -1 ? ":" + port : "") + path;
				System.setProperty("spring.datasource.url", jdbcUrl);
				System.setProperty("SPRING_DATASOURCE_URL", jdbcUrl);
				if (username != null) {
					System.setProperty("spring.datasource.username", username);
					System.setProperty("SPRING_DATASOURCE_USERNAME", username);
				}
				if (password != null) {
					System.setProperty("spring.datasource.password", password);
					System.setProperty("SPRING_DATASOURCE_PASSWORD", password);
				}
			} catch (java.net.URISyntaxException e) {
				System.setProperty("spring.datasource.url", "jdbc:" + rawUrl);
				System.setProperty("SPRING_DATASOURCE_URL", "jdbc:" + rawUrl);
			}
		}
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
