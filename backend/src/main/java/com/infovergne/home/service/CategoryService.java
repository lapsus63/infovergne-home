package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Category;
import com.infovergne.home.repository.AppRepository;
import com.infovergne.home.repository.CategoryRepository;
import com.infovergne.home.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final AppRepository appRepository;
    private final FavoriteRepository favoriteRepository;
    private final AuditService auditService;

    public List<Category> listWithCounts() {
        return categoryRepository.findAll().stream().map(c -> {
            c.setAppsCount(appRepository.countByCategory(c.getName()));
            c.setFavoritesCount(favoriteRepository.countByCategory(c.getName()));
            return c;
        }).toList();
    }

    public Category create(String name, String userId) {
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new IllegalArgumentException("Une catégorie avec ce nom existe déjà");
        }
        Category cat = new Category();
        cat.setId(UUID.randomUUID().toString());
        cat.setName(name.trim());
        cat.setPosition(categoryRepository.maxPosition() + 1);
        Category saved = categoryRepository.save(cat);
        auditService.log(userId, "CREATE", "category", saved.getId(), null);
        return saved;
    }

    public Category update(String id, String name, Integer position, String userId) {
        Category existing = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        if (!existing.getName().equalsIgnoreCase(name) && categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new IllegalArgumentException("Une catégorie avec ce nom existe déjà");
        }
        String oldName = existing.getName();
        existing.setName(name.trim());
        if (position != null) existing.setPosition(position);
        if (!oldName.equals(existing.getName())) {
            appRepository.updateCategory(oldName, existing.getName());
            favoriteRepository.updateCategory(oldName, existing.getName());
        }
        Category saved = categoryRepository.save(existing);
        auditService.log(userId, "UPDATE", "category", id, null);
        return saved;
    }

    public void delete(String id, String userId) {
        Category cat = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + id));
        int appsCount = appRepository.countByCategory(cat.getName());
        int favsCount = favoriteRepository.countByCategory(cat.getName());
        if (appsCount > 0 || favsCount > 0) {
            throw new IllegalArgumentException(
                "Impossible de supprimer la catégorie « %s » : elle est utilisée par %d application(s) et %d favori(s)."
                    .formatted(cat.getName(), appsCount, favsCount));
        }
        categoryRepository.delete(id);
        auditService.log(userId, "DELETE", "category", id, null);
    }
}
