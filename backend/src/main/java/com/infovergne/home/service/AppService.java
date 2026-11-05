package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.AppEntry;
import com.infovergne.home.repository.AppRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AppService {

    private final AppRepository appRepository;
    private final AuditService auditService;

    public List<AppEntry> listAll() {
        return appRepository.findAll();
    }

    public AppEntry create(AppEntry app, String userId) {
        app.setId(UUID.randomUUID().toString());
        app.setState("unknown");
        app.setStateAt(OffsetDateTime.now());
        normalize(app);
        AppEntry saved = appRepository.save(app);
        auditService.log(userId, "CREATE", "app", saved.getId(), null);
        return saved;
    }

    public AppEntry update(String id, AppEntry app, String userId) {
        AppEntry existing = appRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("App not found: " + id));
        app.setId(id);
        app.setState(existing.getState());
        app.setStateAt(existing.getStateAt());
        normalize(app);
        AppEntry saved = appRepository.save(app);
        auditService.log(userId, "UPDATE", "app", id, null);
        return saved;
    }

    public void delete(String id, String userId) {
        appRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("App not found: " + id));
        appRepository.delete(id);
        auditService.log(userId, "DELETE", "app", id, null);
    }

    private void normalize(AppEntry app) {
        if (app.getTags() != null) {
            app.setTags(app.getTags().stream()
                .map(String::trim).filter(t -> !t.isBlank()).map(String::toLowerCase).toList());
        }
        if (app.getAllowedRoles() != null) {
            app.setAllowedRoles(app.getAllowedRoles().stream()
                .map(String::trim).filter(r -> !r.isBlank()).map(String::toUpperCase).toList());
        }
    }
}
