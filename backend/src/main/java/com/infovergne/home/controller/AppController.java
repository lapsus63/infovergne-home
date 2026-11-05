package com.infovergne.home.controller;

import com.infovergne.home.model.AppEntry;
import com.infovergne.home.service.AppService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/apps")
@RequiredArgsConstructor
public class AppController {

    private final AppService appService;

    @GetMapping
    public ResponseEntity<List<AppEntry>> listApps() {
        return ResponseEntity.ok(appService.listAll());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<AppEntry> createApp(@RequestBody AppEntry app, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(appService.create(app, jwt.getSubject()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<AppEntry> updateApp(@PathVariable String id, @RequestBody AppEntry app, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(appService.update(id, app, jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<Void> deleteApp(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        appService.delete(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
