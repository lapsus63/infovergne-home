package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Doc;
import com.infovergne.home.model.Space;
import com.infovergne.home.repository.DocRepository;
import com.infovergne.home.repository.SpaceRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DocServiceTest {

    @Mock DocRepository docRepository;
    @Mock SpaceRepository spaceRepository;
    @Mock AuditService auditService;
    @InjectMocks DocService docService;

    @Test
    void create_generatesSlugFromTitle() {
        Doc doc = new Doc();
        doc.setTitle("Mon premier article");
        doc.setSpaceSlug("blog");
        doc.setBody("contenu");
        doc.setStatus("draft");
        doc.setVisibility("public");
        when(docRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Doc result = docService.create(doc, "user1");

        assertThat(result.getSlug()).isEqualTo("mon-premier-article");
        assertThat(result.getId()).isNotBlank();
        assertThat(result.getUpdatedAt()).isNotNull();
    }

    @Test
    void create_keepsExplicitSlug() {
        Doc doc = new Doc();
        doc.setTitle("Mon article");
        doc.setSlug("slug-custom");
        doc.setSpaceSlug("wiki");
        doc.setBody("contenu");
        doc.setStatus("draft");
        doc.setVisibility("public");
        when(docRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Doc result = docService.create(doc, "user1");

        assertThat(result.getSlug()).isEqualTo("slug-custom");
    }

    @Test
    void update_createsSlugRedirect_whenSlugChanges() {
        Doc existing = new Doc();
        existing.setId("doc1");
        existing.setSlug("old-slug");
        existing.setSpaceSlug("wiki");
        existing.setPublishedAt(OffsetDateTime.now());

        Space space = new Space();
        space.setType("wiki");
        space.setSlug("wiki");

        when(docRepository.findById("doc1")).thenReturn(Optional.of(existing));
        when(spaceRepository.findBySlug("wiki")).thenReturn(Optional.of(space));
        when(docRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Doc update = new Doc();
        update.setSlug("new-slug");
        update.setTitle("Titre");
        update.setSpaceSlug("wiki");
        update.setBody("contenu");
        update.setStatus("published");
        update.setVisibility("public");

        docService.update("doc1", update, "user1");

        verify(docRepository).saveSlugRedirect("wiki:old-slug", "wiki", "wiki", "old-slug", "new-slug");
    }

    @Test
    void delete_throwsNotFound_whenMissing() {
        when(docRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> docService.delete("missing", "user1"))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
