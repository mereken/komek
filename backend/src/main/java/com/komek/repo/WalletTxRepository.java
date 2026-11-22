package com.komek.repo;

import com.komek.model.WalletTx;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WalletTxRepository extends JpaRepository<WalletTx, Long> {
    List<WalletTx> findTop50ByUserIdOrderByIdDesc(Long userId);
}
