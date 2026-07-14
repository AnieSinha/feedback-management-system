package com.feedback.controller;

import com.feedback.dto.UserResponse;
import com.feedback.model.Role;
import com.feedback.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;

    /** Backs the enrollment picker; ADMIN and COORDINATOR only. */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'COORDINATOR')")
    public ResponseEntity<List<UserResponse>> getUsers(@RequestParam(required = false) Role role) {
        List<UserResponse> users = userRepository.findAll().stream()
                .filter(user -> role == null || user.getRole() == role)
                .map(UserResponse::from)
                .toList();
        return ResponseEntity.ok(users);
    }

    /** Lets the SPA learn who it is holding a token for. */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        return userRepository.findByEmail(authentication.getName())
                .map(UserResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
