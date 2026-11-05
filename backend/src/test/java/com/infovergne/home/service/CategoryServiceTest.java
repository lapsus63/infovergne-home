package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Category;
import com.infovergne.home.repository.AppRepository;
import com.infovergne.home.repository.CategoryRepository;
import com.infovergne.home.repository.FavoriteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock CategoryRepository categoryRepository;
    @Mock AppRepository appRepository;
    @Mock FavoriteRepository favoriteRepository;
    @Mock AuditService auditService;
    @InjectMocks CategoryService categoryService;

    @Test
    void create_throwsWhenDuplicateName() {
        when(categoryRepository.existsByNameIgnoreCase("Outils")).thenReturn(true);
        assertThatThrownBy(() -> categoryService.create("Outils", "user1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("existe déjà");
    }

    @Test
    void create_savesAndAudits() {
        when(categoryRepository.existsByNameIgnoreCase("Outils")).thenReturn(false);
        when(categoryRepository.maxPosition()).thenReturn(2);
        when(categoryRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Category result = categoryService.create("Outils", "user1");

        assertThat(result.getName()).isEqualTo("Outils");
        assertThat(result.getPosition()).isEqualTo(3);
        verify(auditService).log(eq("user1"), eq("CREATE"), eq("category"), anyString(), isNull());
    }

    @Test
    void delete_throwsWhenUsedByApps() {
        Category cat = new Category();
        cat.setId("1");
        cat.setName("Outils");
        when(categoryRepository.findById("1")).thenReturn(Optional.of(cat));
        when(appRepository.countByCategory("Outils")).thenReturn(2);
        when(favoriteRepository.countByCategory("Outils")).thenReturn(0);

        assertThatThrownBy(() -> categoryService.delete("1", "user1"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Impossible de supprimer");
    }

    @Test
    void delete_throwsNotFound_whenMissing() {
        when(categoryRepository.findById("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> categoryService.delete("missing", "user1"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delete_succeedsWhenUnused() {
        Category cat = new Category();
        cat.setId("1");
        cat.setName("Vide");
        when(categoryRepository.findById("1")).thenReturn(Optional.of(cat));
        when(appRepository.countByCategory("Vide")).thenReturn(0);
        when(favoriteRepository.countByCategory("Vide")).thenReturn(0);

        categoryService.delete("1", "user1");

        verify(categoryRepository).delete("1");
        verify(auditService).log(eq("user1"), eq("DELETE"), eq("category"), eq("1"), isNull());
    }
}
