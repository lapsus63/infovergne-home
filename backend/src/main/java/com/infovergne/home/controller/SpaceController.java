package com.infovergne.home.controller;

import com.infovergne.home.model.Space;
import com.infovergne.home.service.DocService;
import com.infovergne.home.service.SpaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/spaces")
@RequiredArgsConstructor
public class SpaceController {

    private final SpaceService spaceService;
    private final DocService docService;

    @GetMapping
    public ResponseEntity<List<Space>> listSpaces(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(spaceService.listAccessibleSpaces(extractRoles(jwt)));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<Space> getSpace(@PathVariable String slug, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(spaceService.getSpace(slug, extractRoles(jwt)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<Space> createSpace(@RequestBody Space space, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(spaceService.createSpace(space, jwt.getSubject()));
    }

    @PutMapping("/{slug}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<Space> updateSpace(@PathVariable String slug, @RequestBody Space space, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(spaceService.updateSpace(slug, space, jwt.getSubject()));
    }

    @DeleteMapping("/{slug}")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<Void> deleteSpace(@PathVariable String slug, @AuthenticationPrincipal Jwt jwt) {
        spaceService.deleteSpace(slug, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/by-id/{id}/deletion-impact")
    @PreAuthorize("hasAnyRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getDeletionImpact(@PathVariable String id) {
        DocService.DeletionImpact impact = docService.getSpaceDeletionImpact(id);
        return ResponseEntity.ok(Map.of(
            "spaceName", impact.spaceName(),
            "spaceType", impact.spaceType(),
            "docsCount", impact.docsCount(),
            "publishedDocsCount", impact.publishedDocsCount()
        ));
    }

    static List<String> extractRoles(Jwt jwt) {
        if (jwt == null) return List.of();
        Map<String, Object> realmAccess = jwt.getClaimAsMap("realm_access");
        if (realmAccess == null) return List.of();
        Object roles = realmAccess.get("roles");
        if (roles instanceof List<?> list) return list.stream().map(Object::toString).toList();
        return List.of();
    }
}
