package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Doc;
import com.infovergne.home.model.Space;
import com.infovergne.home.repository.DocRepository;
import com.infovergne.home.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocService {

    private final DocRepository docRepository;
    private final SpaceRepository spaceRepository;
    private final AuditService auditService;

    public record DeletionImpact(String spaceName, String spaceType, int docsCount, int publishedDocsCount) {}

    public DeletionImpact getSpaceDeletionImpact(String spaceId) {
        Space space = spaceRepository.findById(spaceId)
            .orElseThrow(() -> new ResourceNotFoundException("Space not found: " + spaceId));
        int total = docRepository.countBySpaceSlug(space.getSlug());
        int published = docRepository.countPublishedBySpaceSlug(space.getSlug());
        return new DeletionImpact(space.getName(), space.getType(), total, published);
    }

    public List<Doc> listBySpace(String spaceSlug) {
        return docRepository.findBySpaceSlug(spaceSlug);
    }

    public Doc create(Doc doc, String userId) {
        doc.setId(UUID.randomUUID().toString());
        if (doc.getSlug() == null || doc.getSlug().isBlank()) {
            doc.setSlug(slugify(doc.getTitle()));
        }
        OffsetDateTime now = OffsetDateTime.now();
        if (doc.getPublishedAt() == null) doc.setPublishedAt(now);
        doc.setUpdatedAt(now);
        Doc saved = docRepository.save(doc);
        auditService.log(userId, "CREATE", "doc", saved.getId(), null);
        return saved;
    }

    public Doc update(String id, Doc doc, String userId) {
        Doc existing = docRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Doc not found: " + id));
        doc.setId(id);
        if (doc.getSlug() == null || doc.getSlug().isBlank()) {
            doc.setSlug(slugify(doc.getTitle()));
        }
        if (!existing.getSlug().equals(doc.getSlug())) {
            Space space = spaceRepository.findBySlug(existing.getSpaceSlug()).orElse(null);
            String kind = space != null ? space.getType() : "wiki";
            docRepository.saveSlugRedirect(
                existing.getSpaceSlug() + ":" + existing.getSlug(),
                kind, existing.getSpaceSlug(), existing.getSlug(), doc.getSlug());
        }
        doc.setUpdatedAt(OffsetDateTime.now());
        if (doc.getPublishedAt() == null) doc.setPublishedAt(existing.getPublishedAt());
        Doc saved = docRepository.save(doc);
        auditService.log(userId, "UPDATE", "doc", id, null);
        return saved;
    }

    public void delete(String id, String userId) {
        docRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Doc not found: " + id));
        docRepository.delete(id);
        auditService.log(userId, "DELETE", "doc", id, null);
    }

    private String slugify(String text) {
        return text.toLowerCase()
            .replaceAll("[àáâãäå]", "a").replaceAll("[èéêë]", "e")
            .replaceAll("[ìíîï]", "i").replaceAll("[òóôõö]", "o")
            .replaceAll("[ùúûü]", "u").replaceAll("[ç]", "c")
            .replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "")
            .substring(0, Math.min(80, text.length()));
    }
}
