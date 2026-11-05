package com.infovergne.home.service;

import com.infovergne.home.model.Favorite;
import com.infovergne.home.repository.FavoriteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final AuditService auditService;

    public List<Favorite> listPublic() {
        return favoriteRepository.findPublic();
    }

    public List<Favorite> savePublic(List<Favorite> favorites, String userId) {
        favoriteRepository.deletePublic();
        int position = 1;
        for (Favorite fav : favorites) {
            if (fav.getId() == null || fav.getId().isBlank()) fav.setId(UUID.randomUUID().toString());
            fav.setUserId(null);
            fav.setPosition(position++);
            normalize(fav);
            favoriteRepository.save(fav);
        }
        auditService.log(userId, "UPDATE", "favorites", "public", null);
        return favoriteRepository.findPublic();
    }

    private void normalize(Favorite fav) {
        if (fav.getTags() != null) {
            fav.setTags(fav.getTags().stream()
                .map(String::trim).filter(t -> !t.isBlank()).toList());
        }
        if (fav.getAllowedRoles() != null) {
            fav.setAllowedRoles(fav.getAllowedRoles().stream()
                .map(String::trim).filter(r -> !r.isBlank()).map(String::toUpperCase).toList());
        }
    }
}
