package com.infovergne.home.service;

import com.infovergne.home.exception.ForbiddenException;
import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Space;
import com.infovergne.home.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SpaceService {

    private final SpaceRepository spaceRepository;
    private final AuditService auditService;

    /**
     * Liste tous les espaces accessibles par l'utilisateur.
     * Filtre selon la visibilité et les rôles.
     */
    public List<Space> listAccessibleSpaces(List<String> userRoles) {
        List<Space> allSpaces = spaceRepository.findAll();
        
        return allSpaces.stream().filter(space -> isAccessible(space, userRoles)).toList();
    }

    /**
     * Récupère un espace par son slug.
     */
    public Space getSpace(String slug, List<String> userRoles) {
        Space space = spaceRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Space not found: " + slug));
        if (!isAccessible(space, userRoles)) {
            throw new ForbiddenException("Access denied to space: " + slug);
        }
        return space;
    }

    /**
     * Crée un nouvel espace.
     */
    public Space createSpace(Space space, String userId) {
        space.setId(UUID.randomUUID().toString());
        Space created = spaceRepository.save(space);
        
        auditService.log(userId, "CREATE", "space", created.getId(), null);
        log.info("Space created: {} by user {}", created.getSlug(), userId);
        
        return created;
    }

    /**
     * Met à jour un espace existant.
     */
    public Space updateSpace(String slug, Space space, String userId) {
        Space existing = spaceRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Space not found: " + slug));
        space.setId(existing.getId());
        space.setSlug(slug);
        
        Space updated = spaceRepository.save(space);
        auditService.log(userId, "UPDATE", "space", updated.getId(), null);
        log.info("Space updated: {} by user {}", slug, userId);
        return updated;
    }

    /**
     * Supprime un espace.
     */
    public void deleteSpace(String slug, String userId) {
        Space space = spaceRepository.findBySlug(slug).orElseThrow(() -> new ResourceNotFoundException("Space not found: " + slug));
        
        spaceRepository.delete(space.getId());
        
        auditService.log(userId, "DELETE", "space", space.getId(), null);
        log.info("Space deleted: {} by user {}", slug, userId);
    }

    /**
     * Vérifie si un espace est accessible par l'utilisateur.
     */
    private boolean isAccessible(Space space, List<String> userRoles) {
        if ("public".equals(space.getVisibility())) {
            return true;
        }
        
        if (space.getAllowedRoles() == null || space.getAllowedRoles().isEmpty()) {
            return true;
        }
        
        return userRoles.stream()
            .anyMatch(role -> space.getAllowedRoles().contains(role.toUpperCase()));
    }
}
