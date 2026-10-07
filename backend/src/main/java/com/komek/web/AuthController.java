package com.komek.web;

import com.komek.dto.*;
import com.komek.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;

    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/register/start")
    public StartResponse start(@Valid @RequestBody StartRequest req) { return auth.start(req); }

    @PostMapping("/register/verify")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse verify(@Valid @RequestBody VerifyRequest req) { return auth.verify(req); }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) { return auth.login(req); }
}
