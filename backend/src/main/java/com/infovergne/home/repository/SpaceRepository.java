package com.infovergne.home.repository;

import com.infovergne.home.model.Space;
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
public class SpaceRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<Space> ROW_MAPPER = (rs, rowNum) -> {
        Space space = new Space();
        space.setId(rs.getString("id"));
        space.setSlug(rs.getString("slug"));
        space.setName(rs.getString("name"));
        space.setType(rs.getString("type"));
        space.setDescription(rs.getString("description"));
        space.setAccent(rs.getString("accent"));
        space.setVisibility(rs.getString("visibility"));
        space.setAllowedRoles(arrayToList(rs.getArray("allowed_roles")));
        space.setWriteRoles(arrayToList(rs.getArray("write_roles")));
        space.setPosition(rs.getInt("position"));
        return space;
    };

    public List<Space> findAll() {
        String sql = "SELECT * FROM spaces ORDER BY position, name";
        return jdbcTemplate.query(sql, ROW_MAPPER);
    }

    public Optional<Space> findBySlug(String slug) {
        String sql = "SELECT * FROM spaces WHERE slug = ?";
        List<Space> results = jdbcTemplate.query(sql, ROW_MAPPER, slug);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Space save(Space space) {
        String sql = """
            INSERT INTO spaces (id, slug, name, type, description, accent, visibility, allowed_roles, write_roles, position)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                slug = EXCLUDED.slug,
                name = EXCLUDED.name,
                type = EXCLUDED.type,
                description = EXCLUDED.description,
                accent = EXCLUDED.accent,
                visibility = EXCLUDED.visibility,
                allowed_roles = EXCLUDED.allowed_roles,
                write_roles = EXCLUDED.write_roles,
                position = EXCLUDED.position
            RETURNING *
            """;
        
        return jdbcTemplate.queryForObject(sql, ROW_MAPPER,
            space.getId(),
            space.getSlug(),
            space.getName(),
            space.getType(),
            space.getDescription(),
            space.getAccent(),
            space.getVisibility(),
            listToArray(space.getAllowedRoles()),
            listToArray(space.getWriteRoles()),
            space.getPosition()
        );
    }

    public void delete(String id) {
        String sql = "DELETE FROM spaces WHERE id = ?";
        jdbcTemplate.update(sql, id);
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
