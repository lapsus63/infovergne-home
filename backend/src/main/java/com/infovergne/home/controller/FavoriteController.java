package com.infovergne.home.controller;

import com.infovergne.home.model.Favorite;
import com.infovergne.home.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping("/public")
    public ResponseEntity<List<Favorite>> listPublic() {
        return ResponseEntity.ok(favoriteService.listPublic());
    }

    @PutMapping("/public")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<List<Favorite>> savePublic(@RequestBody List<Favorite> favorites, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(favoriteService.savePublic(favorites, jwt.getSubject()));
    }
}
