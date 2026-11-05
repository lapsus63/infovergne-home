package com.infovergne.home.service;

import com.infovergne.home.model.AppEntry;
import com.infovergne.home.repository.AppRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppServiceTest {

    @Mock AppRepository appRepository;
    @Mock AuditService auditService;
    @InjectMocks AppService appService;

    @Test
    void create_normalizesTagsAndRoles() {
        AppEntry app = new AppEntry();
        app.setName("Gitea");
        app.setTags(List.of(" Git ", "DEV", ""));
        app.setAllowedRoles(List.of(" admin ", "dev_team"));
        app.setVisibility("public");
        when(appRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppEntry result = appService.create(app, "user1");

        assertThat(result.getTags()).containsExactly("git", "dev");
        assertThat(result.getAllowedRoles()).containsExactly("ADMIN", "DEV_TEAM");
        assertThat(result.getState()).isEqualTo("unknown");
    }

    @Test
    void update_preservesStateFromExisting() {
        AppEntry existing = new AppEntry();
        existing.setId("app1");
        existing.setState("running");
        existing.setStateAt(OffsetDateTime.now());

        when(appRepository.findById("app1")).thenReturn(Optional.of(existing));
        when(appRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        AppEntry update = new AppEntry();
        update.setName("Gitea");
        update.setTags(List.of());
        update.setAllowedRoles(List.of());
        update.setVisibility("public");

        AppEntry result = appService.update("app1", update, "user1");

        assertThat(result.getState()).isEqualTo("running");
    }
}
