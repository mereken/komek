package com.komek.web;

import com.komek.dto.AmountRequest;
import com.komek.dto.CardRequest;
import com.komek.dto.WalletDto;
import com.komek.service.NotificationService;
import com.komek.service.WalletService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {
    private final WalletService wallet;
    private final NotificationService notifications;

    public WalletController(WalletService wallet, NotificationService notifications) {
        this.wallet = wallet;
        this.notifications = notifications;
    }

    private static Long uid(Authentication a) { return Long.valueOf(a.getName()); }

    @GetMapping
    public WalletDto get(Authentication a) {
        notifications.markWalletRead(uid(a));
        return wallet.wallet(uid(a));
    }

    @PutMapping("/card")
    public WalletDto saveCard(Authentication a, @Valid @RequestBody CardRequest r) { return wallet.saveCard(uid(a), r); }

    @DeleteMapping("/card")
    public WalletDto removeCard(Authentication a) { return wallet.removeCard(uid(a)); }

    @PostMapping("/topup")
    public WalletDto topUp(Authentication a, @Valid @RequestBody AmountRequest r) { return wallet.topUp(uid(a), r); }

    @PostMapping("/withdraw")
    public WalletDto withdraw(Authentication a, @Valid @RequestBody AmountRequest r) { return wallet.withdraw(uid(a), r); }
}
