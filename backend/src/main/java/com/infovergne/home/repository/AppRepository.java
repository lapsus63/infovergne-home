package com.infovergne.home.repository;

import com.infovergne.home.model.AppEntry;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class AppRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<AppEntry> ROW_MAPPER = (rs, rowNum) -> {
        AppEntry app = new AppEntry();
        app.setId(rs.getString("id"));
        app.setName(rs.getString("name"));
        app.setDescription(rs.getString("description"));
        app.setCategory(rs.getString("category"));
        app.setUrl(rs.getString("url"));
        app.setTags(arrayToList(rs.getArray("tags")));
        app.setContainerName(rs.getString("container_name"));
        app.setVisibility(rs.getString("visibility"));
        app.setAllowedRoles(arrayToList(rs.getArray("allowed_roles")));
        app.setState(rs.getString("state"));
        var stateAt = rs.getTimestamp("state_at");
        if (stateAt != null) app.setStateAt(stateAt.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return app;
    };

    public List<AppEntry> findAll() {
        return jdbcTemplate.query("SELECT * FROM apps ORDER BY name", ROW_MAPPER);
    }

    public Optional<AppEntry> findById(String id) {
        List<AppEntry> results = jdbcTemplate.query("SELECT * FROM apps WHERE id = ?", ROW_MAPPER, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public AppEntry save(AppEntry app) {
        String sql = """
            INSERT INTO apps (id, name, description, category, url, tags, container_name, visibility, allowed_roles, state, state_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
                url = EXCLUDED.url, tags = EXCLUDED.tags, container_name = EXCLUDED.container_name,
                visibility = EXCLUDED.visibility, allowed_roles = EXCLUDED.allowed_roles,
                state = EXCLUDED.state, state_at = EXCLUDED.state_at
            RETURNING *
            """;
        return jdbcTemplate.queryForObject(sql, ROW_MAPPER,
            app.getId(), app.getName(), app.getDescription(), app.getCategory(), app.getUrl(),
            listToArray(app.getTags()), app.getContainerName(), app.getVisibility(),
            listToArray(app.getAllowedRoles()), app.getState(), app.getStateAt());
    }

    public void delete(String id) {
        jdbcTemplate.update("DELETE FROM apps WHERE id = ?", id);
    }

    public int countByCategory(String category) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM apps WHERE category = ?", Integer.class, category);
        return count != null ? count : 0;
    }

    public void updateCategory(String oldName, String newName) {
        jdbcTemplate.update("UPDATE apps SET category = ? WHERE category = ?", newName, oldName);
    }

    private static List<String> arrayToList(Array array) {
        if (array == null) return List.of();
        try {
            String[] arr = (String[]) array.getArray();
            return arr != null ? List.of(arr) : List.of();
        } catch (SQLException e) {
            return List.of();
        }
    }

    private static Object listToArray(List<String> list) {
        if (list == null || list.isEmpty()) return new String[0];
        return list.toArray(new String[0]);
    }
}
