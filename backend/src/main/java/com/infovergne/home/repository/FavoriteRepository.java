package com.infovergne.home.repository;

import com.infovergne.home.model.Favorite;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.Array;
import java.sql.SQLException;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class FavoriteRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<Favorite> ROW_MAPPER = (rs, rowNum) -> {
        Favorite fav = new Favorite();
        fav.setId(rs.getString("id"));
        fav.setUserId(rs.getString("user_id"));
        fav.setLabel(rs.getString("label"));
        fav.setHref(rs.getString("href"));
        fav.setKind(rs.getString("kind"));
        fav.setPosition(rs.getInt("position"));
        fav.setCategory(rs.getString("category"));
        fav.setDescription(rs.getString("description"));
        fav.setTags(arrayToList(rs.getArray("tags")));
        fav.setVisibility(rs.getString("visibility"));
        fav.setAllowedRoles(arrayToList(rs.getArray("allowed_roles")));
        return fav;
    };

    public List<Favorite> findPublic() {
        return jdbcTemplate.query("SELECT * FROM favorites WHERE user_id IS NULL ORDER BY position", ROW_MAPPER);
    }

    public void deletePublic() {
        jdbcTemplate.update("DELETE FROM favorites WHERE user_id IS NULL");
    }

    public Favorite save(Favorite fav) {
        jdbcTemplate.update("""
            INSERT INTO favorites (id, user_id, label, href, kind, position, category, description, tags, visibility, allowed_roles)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                label = EXCLUDED.label, href = EXCLUDED.href, kind = EXCLUDED.kind,
                position = EXCLUDED.position, category = EXCLUDED.category,
                description = EXCLUDED.description, tags = EXCLUDED.tags,
                visibility = EXCLUDED.visibility, allowed_roles = EXCLUDED.allowed_roles
            """,
            fav.getId(), fav.getUserId(), fav.getLabel(), fav.getHref(), fav.getKind(),
            fav.getPosition(), fav.getCategory(), fav.getDescription(),
            listToArray(fav.getTags()), fav.getVisibility(), listToArray(fav.getAllowedRoles()));
        return fav;
    }

    public int countByCategory(String category) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM favorites WHERE category = ?", Integer.class, category);
        return count != null ? count : 0;
    }

    public void updateCategory(String oldName, String newName) {
        jdbcTemplate.update("UPDATE favorites SET category = ? WHERE category = ?", newName, oldName);
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
