package com.infovergne.home.controller;

import com.infovergne.home.model.Space;
import com.infovergne.home.service.SpaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/spaces")
@RequiredArgsConstructor
public class SpaceController {

    private final SpaceService spaceService;

    /**
     * Liste tous les espaces accessibles par l'utilisateur.
     */
    @GetMapping
    public ResponseEntity<List<Space>> listSpaces(@AuthenticationPrincipal Jwt jwt) {
        List<String> userRoles = extractRoles(jwt);
        List<Space> spaces = spaceService.listAccessibleSpaces(userRoles);
        return ResponseEntity.ok(spaces);
    }

    /**
     * Récupère un espace par son slug.
     */
    @GetMapping("/{slug}")
    public ResponseEntity<Space> getSpace(@PathVariable String slug, @AuthenticationPrincipal Jwt jwt) {
        List<String> userRoles = extractRoles(jwt);
        Space space = spaceService.getSpace(slug, userRoles);
        return ResponseEntity.ok(space);
    }

    /**
     * Crée un nouvel espace (admin uniquement).
     */
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'INFOVERGNE_ADMIN')")
    public ResponseEntity<Space> createSpace(@RequestBody Space space, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Space created = spaceService.createSpace(space, userId);
        return ResponseEntity.ok(created);
    }

    /**
     * Met à jour un espace existant (admin uniquement).
     */
    @PutMapping("/{slug}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INFOVERGNE_ADMIN')")
    public ResponseEntity<Space> updateSpace(@PathVariable String slug, @RequestBody Space space, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        Space updated = spaceService.updateSpace(slug, space, userId);
        return ResponseEntity.ok(updated);
    }

    /**
     * Supprime un espace (admin uniquement).
     */
    @DeleteMapping("/{slug}")
    @PreAuthorize("hasAnyRole('ADMIN', 'INFOVERGNE_ADMIN')")
    public ResponseEntity<Void> deleteSpace(@PathVariable String slug, @AuthenticationPrincipal Jwt jwt) {
        String userId = jwt.getSubject();
        spaceService.deleteSpace(slug, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Extrait les rôles du JWT (en majuscules, sans le préfixe ROLE_).
     */
    private List<String> extractRoles(Jwt jwt) {
        return jwt.getClaimAsStringList("realm_access.roles");
    }
}
