package com.komek.service;

import com.komek.model.Avatar;
import com.komek.model.User;
import com.komek.repo.AvatarRepository;
import com.komek.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

/** Profile photos. The app shrinks the picture to ~256 px before sending, so the limits here are generous. */
@Service
@Transactional
public class AvatarService {
    private static final int MAX_BYTES = 400_000;
    private static final int MAX_CHARS = MAX_BYTES * 4 / 3 + 200;
    private static final Map<String, String> TYPES = Map.of(
            "data:image/jpeg;base64", "image/jpeg",
            "data:image/png;base64", "image/png",
            "data:image/webp;base64", "image/webp");

    private final AvatarRepository avatars;
    private final UserRepository users;
    private final SecureRandom random = new SecureRandom();

    public AvatarService(AvatarRepository avatars, UserRepository users) {
        this.avatars = avatars;
        this.users = users;
    }

    public void save(Long uid, String dataUrl) {
        if (dataUrl == null || dataUrl.length() > MAX_CHARS) throw bad("Фото слишком большое");
        int comma = dataUrl.indexOf(',');
        String type = comma < 0 ? null : TYPES.get(dataUrl.substring(0, comma));
        if (type == null) throw bad("Поддерживаются JPG, PNG и WebP");

        byte[] bytes;
        try {
            bytes = Base64.getMimeDecoder().decode(dataUrl.substring(comma + 1));
        } catch (IllegalArgumentException e) {
            throw bad("Не удалось прочитать фото");
        }
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw bad("Фото слишком большое");
        if (!matchesType(bytes, type)) throw bad("Файл не похож на изображение");

        User u = users.findById(uid).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
        Avatar a = avatars.findById(uid).orElseGet(Avatar::new);
        byte[] key = new byte[16];
        random.nextBytes(key);
        a.setUserId(uid);
        a.setPhotoKey(HexFormat.of().formatHex(key));
        a.setContentType(type);
        a.setData(bytes);
        avatars.save(a);
        u.setAvatarKey(a.getPhotoKey());
        users.save(u);
    }

    public void remove(Long uid) {
        User u = users.findById(uid).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Пользователь не найден"));
        if (avatars.existsById(uid)) avatars.deleteById(uid);
        u.setAvatarKey(null);
        users.save(u);
    }

    @Transactional(readOnly = true)
    public Avatar byKey(String key) {
        return avatars.findByPhotoKey(key).orElse(null);
    }

    /** The first bytes of a real image file ("magic numbers") must match the declared type. */
    private static boolean matchesType(byte[] b, String type) {
        if (b.length < 12) return false;
        return switch (type) {
            case "image/jpeg" -> (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
            case "image/png" -> (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G';
            case "image/webp" -> b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                    && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
            default -> false;
        };
    }

    private static ResponseStatusException bad(String msg) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}
