package com.ledger.core;

import java.math.BigDecimal;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.support.TransactionTemplate;

import com.ledger.core.dto.TransactionRequest;
import com.ledger.core.model.TransactionType;
import com.ledger.core.model.User;
import com.ledger.core.repository.TransactionRepository;
import com.ledger.core.repository.UserRepository;
import com.ledger.core.service.LedgerService;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
public class LedgerConcurrencyTest {

    @Autowired
    private LedgerService ledgerService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private TransactionTemplate transactionTemplate;

    private UUID testUserId;

    @BeforeEach
    void setUp() {
        transactionTemplate.execute(status -> {
            transactionRepository.deleteAll();
            userRepository.deleteAll();
            User user = User.builder()
                    .username("test-user-" + UUID.randomUUID())
                    .balance(new BigDecimal("100.00"))
                    .build();
            User saved = userRepository.save(user);
            testUserId = saved.getId();
            return null;
        });
    }

    @Test
    void testConcurrencyWithLockingEnabled() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await(); // wait for trigger
                    TransactionRequest request = TransactionRequest.builder()
                            .amount(new BigDecimal("80.00"))
                            .type(TransactionType.DEBIT)
                            .idempotencyKey("key-lock-" + index)
                            .build();
                    ledgerService.createTransaction(testUserId, request, false);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown(); // trigger threads simultaneously
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // One request must succeed, one must fail due to insufficient balance
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(1);

        User finalUser = userRepository.findById(testUserId).orElseThrow();
        assertThat(finalUser.getBalance()).isEqualByComparingTo(new BigDecimal("20.00"));
    }

    @Test
    void testConcurrencyWithLockingDisabled() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    TransactionRequest request = TransactionRequest.builder()
                            .amount(new BigDecimal("80.00"))
                            .type(TransactionType.DEBIT)
                            .idempotencyKey("key-nolock-" + index)
                            .build();
                    ledgerService.createTransaction(testUserId, request, true);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown();
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // With locking disabled and a 100ms sleep, both threads read 100 balance,
        // both validate 100 >= 80, and both succeed, leading to database inconsistency
        assertThat(successCount.get()).isEqualTo(2);
        assertThat(failureCount.get()).isEqualTo(0);

        // Balance is inconsistent: both transactions were recorded
        long txCount = transactionRepository.count();
        assertThat(txCount).isEqualTo(2);
    }

    @Test
    void testJvmConcurrencyWithLockingEnabled() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await(); // wait for trigger
                    TransactionRequest request = TransactionRequest.builder()
                            .amount(new BigDecimal("80.00"))
                            .type(TransactionType.DEBIT)
                            .idempotencyKey("key-jvmlock-" + index)
                            .build();
                    ledgerService.createTransactionJvmLock(testUserId, request, false);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown(); // trigger threads simultaneously
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // One request must succeed, one must fail due to insufficient balance
        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(1);

        User finalUser = userRepository.findById(testUserId).orElseThrow();
        assertThat(finalUser.getBalance()).isEqualByComparingTo(new BigDecimal("20.00"));
    }

    @Test
    void testJvmConcurrencyWithLockingDisabled() throws InterruptedException {
        int threads = 2;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch latch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threads);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    latch.await();
                    TransactionRequest request = TransactionRequest.builder()
                            .amount(new BigDecimal("80.00"))
                            .type(TransactionType.DEBIT)
                            .idempotencyKey("key-jvm-nolock-" + index)
                            .build();
                    ledgerService.createTransactionJvmLock(testUserId, request, true);
                    successCount.incrementAndGet();
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        latch.countDown();
        doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        // With JVM locking disabled and 100ms delay, both proceed and overwrite/double-debit
        assertThat(successCount.get()).isEqualTo(2);
        assertThat(failureCount.get()).isEqualTo(0);

        long txCount = transactionRepository.count();
        assertThat(txCount).isEqualTo(2);
    }
}
