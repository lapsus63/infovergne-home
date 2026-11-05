package com.infovergne.home.repository;

import com.infovergne.home.model.SiteSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class SettingsRepository {

    private final JdbcTemplate jdbcTemplate;

    public SiteSettings load() {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT key, value FROM site_settings");
        Map<String, String> map = new java.util.HashMap<>();
        for (Map<String, Object> row : rows) {
            map.put((String) row.get("key"), (String) row.get("value"));
        }
        SiteSettings s = new SiteSettings();
        s.setMemoDocId(map.getOrDefault("memo_doc_id", ""));
        s.setSiteTitle(map.getOrDefault("site_title", "Infovergne"));
        s.setSiteTagline(map.getOrDefault("site_tagline", ""));
        s.setBackupCron(map.getOrDefault("backup_cron", "0 2 * * *"));
        s.setBackupKeep(Integer.parseInt(map.getOrDefault("backup_keep", "7")));
        return s;
    }

    public void save(SiteSettings settings) {
        upsert("memo_doc_id", settings.getMemoDocId());
        upsert("site_title", settings.getSiteTitle());
        upsert("site_tagline", settings.getSiteTagline());
        upsert("backup_cron", settings.getBackupCron());
        upsert("backup_keep", String.valueOf(settings.getBackupKeep()));
    }

    private void upsert(String key, String value) {
        jdbcTemplate.update("""
            INSERT INTO site_settings (key, value) VALUES (?, ?)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            """, key, value != null ? value : "");
    }
}
