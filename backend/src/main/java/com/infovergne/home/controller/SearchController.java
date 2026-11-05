package com.infovergne.home.controller;

import com.infovergne.home.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> search(@RequestParam String q, @AuthenticationPrincipal Jwt jwt) {
        List<String> roles = SpaceController.extractRoles(jwt);
        boolean isAdmin = roles.stream().anyMatch(r -> r.equalsIgnoreCase("ADMIN"));
        List<SearchService.SearchResult> results = searchService.search(q, roles, isAdmin);
        return ResponseEntity.ok(Map.of("results", results));
    }
}
