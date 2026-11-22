package com.komek.repo;

import com.komek.model.Payment;
import com.komek.model.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    /** The payment that currently holds money for the order (PAID), or the finished one (RELEASED/REFUNDED). */
    Optional<Payment> findFirstByTaskIdAndStatusInOrderByIdDesc(Long taskId, Collection<PaymentStatus> statuses);

    List<Payment> findByTaskId(Long taskId);
}
