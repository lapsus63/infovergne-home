package com.infovergne.home.controller;

import com.infovergne.home.model.Media;
import com.infovergne.home.service.MediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class MediaController {

    private final MediaService mediaService;

    @GetMapping
    public ResponseEntity<List<Media>> listMedia() {
        return ResponseEntity.ok(mediaService.listAll());
    }

    @PostMapping("/upload")
    public ResponseEntity<Media> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "width", defaultValue = "0") int width,
            @RequestParam(value = "height", defaultValue = "0") int height,
            @AuthenticationPrincipal Jwt jwt) throws IOException {
        return ResponseEntity.ok(mediaService.upload(file, name, width, height, jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMedia(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        mediaService.delete(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
