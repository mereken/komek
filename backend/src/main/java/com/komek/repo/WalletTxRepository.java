package com.komek.repo;

import com.komek.model.TxType;
import com.komek.model.WalletTx;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface WalletTxRepository extends JpaRepository<WalletTx, Long> {
    List<WalletTx> findTop50ByUserIdOrderByIdDesc(Long userId);

    /** Total of one type of operations that are NOT expense advances (used for "Заработано"). */
    @Query("select coalesce(sum(w.amount), 0L) from WalletTx w where w.user.id = :uid and w.type = :type and w.advance = false")
    Long sumOwn(@Param("uid") Long uid, @Param("type") TxType type);
}
