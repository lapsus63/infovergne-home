package com.infovergne.home.controller;

import com.infovergne.home.model.SiteSettings;
import com.infovergne.home.service.SettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN')")
public class SettingsController {

    private final SettingsService settingsService;

    @GetMapping
    public ResponseEntity<SiteSettings> getSettings() {
        return ResponseEntity.ok(settingsService.get());
    }

    @PutMapping
    public ResponseEntity<SiteSettings> saveSettings(@RequestBody SiteSettings settings, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(settingsService.save(settings, jwt.getSubject()));
    }
}
