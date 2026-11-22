package com.komek.web;

import com.komek.model.Avatar;
import com.komek.service.AvatarService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Public photo URL (an <img> tag can't send the login token). The key in the URL is random and changes with each new photo. */
@RestController
public class AvatarController {
    private final AvatarService avatars;

    public AvatarController(AvatarService avatars) { this.avatars = avatars; }

    @GetMapping("/api/avatars/{key}")
    public ResponseEntity<byte[]> get(@PathVariable("key") String key) {
        Avatar a = avatars.byKey(key);
        if (a == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(a.getContentType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic())
                .body(a.getData());
    }
}
