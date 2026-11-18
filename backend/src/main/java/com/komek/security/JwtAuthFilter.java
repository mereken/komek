package com.komek.security;

import com.komek.repo.UserRepository;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    private final UserRepository users;

    public JwtAuthFilter(JwtService jwt, UserRepository users) {
        this.jwt = jwt;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Long id = jwt.extractUserId(header.substring(7));
                // The admin flag is read from the database on every request, so removing it takes effect at once.
                users.findById(id).ifPresent(u -> {
                    List<GrantedAuthority> authorities = u.isAdmin()
                            ? List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
                            : List.of();
                    // principal name = user id as text
                    SecurityContextHolder.getContext().setAuthentication(
                            new UsernamePasswordAuthenticationToken(String.valueOf(id), null, authorities));
                });
            } catch (JwtException | IllegalArgumentException ignored) {
                // bad token -> request stays unauthenticated -> 401 on protected routes
            }
        }
        chain.doFilter(req, res);
    }
}
