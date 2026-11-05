package com.infovergne.home.controller;

import com.infovergne.home.model.Category;
import com.infovergne.home.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN')")
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping
    public ResponseEntity<List<Category>> listCategories() {
        return ResponseEntity.ok(categoryService.listWithCounts());
    }

    @PostMapping
    public ResponseEntity<Category> createCategory(@RequestBody Map<String, String> body, @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(categoryService.create(body.get("name"), jwt.getSubject()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable String id, @RequestBody Map<String, Object> body, @AuthenticationPrincipal Jwt jwt) {
        String name = (String) body.get("name");
        Integer position = body.get("position") instanceof Number n ? n.intValue() : null;
        return ResponseEntity.ok(categoryService.update(id, name, position, jwt.getSubject()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable String id, @AuthenticationPrincipal Jwt jwt) {
        categoryService.delete(id, jwt.getSubject());
        return ResponseEntity.noContent().build();
    }
}
