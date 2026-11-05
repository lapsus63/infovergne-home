package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Space;
import com.infovergne.home.repository.SpaceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpaceServiceTest {

    @Mock SpaceRepository spaceRepository;
    @Mock AuditService auditService;
    @InjectMocks SpaceService spaceService;

    private Space publicSpace;
    private Space restrictedSpace;

    @BeforeEach
    void setUp() {
        publicSpace = new Space();
        publicSpace.setId("1");
        publicSpace.setSlug("general");
        publicSpace.setName("Général");
        publicSpace.setVisibility("public");
        publicSpace.setAllowedRoles(List.of());

        restrictedSpace = new Space();
        restrictedSpace.setId("2");
        restrictedSpace.setSlug("private");
        restrictedSpace.setName("Privé");
        restrictedSpace.setVisibility("restricted");
        restrictedSpace.setAllowedRoles(List.of("ADMIN"));
    }

    @Test
    void listAccessibleSpaces_returnsPublicForAnonymous() {
        when(spaceRepository.findAll()).thenReturn(List.of(publicSpace, restrictedSpace));
        List<Space> result = spaceService.listAccessibleSpaces(List.of());
        assertThat(result).containsExactly(publicSpace);
    }

    @Test
    void listAccessibleSpaces_returnsAllForAdmin() {
        when(spaceRepository.findAll()).thenReturn(List.of(publicSpace, restrictedSpace));
        List<Space> result = spaceService.listAccessibleSpaces(List.of("ADMIN"));
        assertThat(result).containsExactlyInAnyOrder(publicSpace, restrictedSpace);
    }

    @Test
    void getSpace_throwsNotFound_whenMissing() {
        when(spaceRepository.findBySlug("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> spaceService.getSpace("missing", List.of()))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void createSpace_assignsIdAndAudits() {
        Space input = new Space();
        input.setSlug("new");
        input.setName("New");
        input.setVisibility("public");
        input.setAllowedRoles(List.of());
        when(spaceRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        Space result = spaceService.createSpace(input, "user1");

        assertThat(result.getId()).isNotBlank();
        verify(auditService).log(eq("user1"), eq("CREATE"), eq("space"), anyString(), isNull());
    }

    @Test
    void deleteSpace_throwsNotFound_whenMissing() {
        when(spaceRepository.findBySlug("missing")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> spaceService.deleteSpace("missing", "user1"))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
