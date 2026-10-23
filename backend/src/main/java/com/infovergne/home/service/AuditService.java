package com.infovergne.home.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuditService {

    private final JdbcTemplate jdbcTemplate;

    /**
     * Enregistre une action dans les logs d'audit.
     */
    public void log(String userId, String action, String entityType, String entityId, Map<String, Object> changes) {
        try {
            String sql = "INSERT INTO audit_logs (user_id, action, entity_type, entity_id, changes) VALUES (?, ?, ?, ?, ?::jsonb)";
            String changesJson = changes != null ? toJson(changes) : null;
            jdbcTemplate.update(sql, userId, action, entityType, entityId, changesJson);
        } catch (Exception e) {
            log.error("Failed to log audit entry", e);
        }
    }

    /**
     * Convertit une Map en JSON simple (pour PostgreSQL JSONB).
     */
    private String toJson(Map<String, Object> map) {
        // TODO Simple conversion - pour production, utiliser Jackson
        StringBuilder json = new StringBuilder("{");
        map.forEach((key, value) -> {
            if (json.length() > 1) {
                json.append(",");
            }
            json.append("\"").append(key).append("\":");
            if (value instanceof String) {
                json.append("\"").append(value).append("\"");
            } else {
                json.append(value);
            }
        });
        json.append("}");
        return json.toString();
    }
}
