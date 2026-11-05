package com.infovergne.home.controller;

import com.infovergne.home.model.Doc;
import com.infovergne.home.service.DocService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/docs")
@RequiredArgsConstructor
public class DocController {

    private final DocService docService;

    @GetMapping("/space/{spaceSlug}")
    public ResponseEntity<List<Doc>> listBySpace(@PathVariable String spaceSlug) {
        return ResponseEntity.ok(docService.listBySpace(spaceSlug));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Doc> createDoc(@RequestBody Doc doc, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(docService.create(doc, jwt.getSubject()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Doc> updateDoc(@PathVariable String id, @RequestBody Doc doc, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(docService.update(id, doc, jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteDoc(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        docService.delete(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
