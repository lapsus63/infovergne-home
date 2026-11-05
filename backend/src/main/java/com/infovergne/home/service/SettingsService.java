package com.infovergne.home.service;

import com.infovergne.home.model.SiteSettings;
import com.infovergne.home.repository.SettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SettingsService {

    private final SettingsRepository settingsRepository;
    private final AuditService auditService;

    public SiteSettings get() {
        return settingsRepository.load();
    }

    public SiteSettings save(SiteSettings settings, String userId) {
        settingsRepository.save(settings);
        auditService.log(userId, "UPDATE", "settings", "site", null);
        return settingsRepository.load();
    }
}
