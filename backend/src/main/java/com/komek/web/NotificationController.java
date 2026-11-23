package com.komek.web;

import com.komek.dto.AdminDtos.Ok;
import com.komek.dto.NotifSummary;
import com.komek.dto.NotificationDto;
import com.komek.service.NotificationService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) { this.notifications = notifications; }

    private static Long uid(Authentication a) { return Long.valueOf(a.getName()); }

    /** Numbers for the tab bar (+1 marks). The app asks for them when it opens and about once a minute. */
    @GetMapping("/summary")
    public NotifSummary summary(Authentication a) { return notifications.summary(uid(a)); }

    @GetMapping
    public List<NotificationDto> list(Authentication a) { return notifications.list(uid(a)); }

    @PostMapping("/{id}/read")
    public Ok read(Authentication a, @PathVariable("id") Long id) {
        notifications.markRead(uid(a), id);
        return new Ok(true);
    }

    @PostMapping("/read-all")
    public Ok readAll(Authentication a) {
        notifications.markAllRead(uid(a));
        return new Ok(true);
    }
}
