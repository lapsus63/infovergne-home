package com.infovergne.home.repository;

import com.infovergne.home.model.Doc;
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
public class DocRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<Doc> ROW_MAPPER = (rs, rowNum) -> {
        Doc doc = new Doc();
        doc.setId(rs.getString("id"));
        doc.setSpaceSlug(rs.getString("space_slug"));
        doc.setSlug(rs.getString("slug"));
        doc.setTitle(rs.getString("title"));
        doc.setExcerpt(rs.getString("excerpt"));
        doc.setBody(rs.getString("body"));
        doc.setTags(arrayToList(rs.getArray("tags")));
        doc.setStatus(rs.getString("status"));
        doc.setVisibility(rs.getString("visibility"));
        doc.setAllowedRoles(arrayToList(rs.getArray("allowed_roles")));
        doc.setAuthor(rs.getString("author"));
        var publishedAt = rs.getTimestamp("published_at");
        if (publishedAt != null) doc.setPublishedAt(publishedAt.toInstant().atOffset(java.time.ZoneOffset.UTC));
        var updatedAt = rs.getTimestamp("updated_at");
        if (updatedAt != null) doc.setUpdatedAt(updatedAt.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return doc;
    };

    public List<Doc> findAll() {
        return jdbcTemplate.query("SELECT * FROM docs ORDER BY published_at DESC", ROW_MAPPER);
    }

    public List<Doc> findBySpaceSlug(String spaceSlug) {
        return jdbcTemplate.query("SELECT * FROM docs WHERE space_slug = ? ORDER BY published_at DESC", ROW_MAPPER, spaceSlug);
    }

    public Optional<Doc> findById(String id) {
        List<Doc> results = jdbcTemplate.query("SELECT * FROM docs WHERE id = ?", ROW_MAPPER, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Optional<Doc> findBySpaceSlugAndSlug(String spaceSlug, String slug) {
        List<Doc> results = jdbcTemplate.query("SELECT * FROM docs WHERE space_slug = ? AND slug = ?", ROW_MAPPER, spaceSlug, slug);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Doc save(Doc doc) {
        String sql = """
            INSERT INTO docs (id, space_slug, slug, title, excerpt, body, tags, status, visibility, allowed_roles, author, published_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET
                space_slug = EXCLUDED.space_slug, slug = EXCLUDED.slug, title = EXCLUDED.title,
                excerpt = EXCLUDED.excerpt, body = EXCLUDED.body, tags = EXCLUDED.tags,
                status = EXCLUDED.status, visibility = EXCLUDED.visibility,
                allowed_roles = EXCLUDED.allowed_roles, author = EXCLUDED.author,
                published_at = EXCLUDED.published_at, updated_at = EXCLUDED.updated_at
            RETURNING *
            """;
        return jdbcTemplate.queryForObject(sql, ROW_MAPPER,
            doc.getId(), doc.getSpaceSlug(), doc.getSlug(), doc.getTitle(), doc.getExcerpt(),
            doc.getBody(), listToArray(doc.getTags()), doc.getStatus(), doc.getVisibility(),
            listToArray(doc.getAllowedRoles()), doc.getAuthor(),
            doc.getPublishedAt(), doc.getUpdatedAt());
    }

    public void delete(String id) {
        jdbcTemplate.update("DELETE FROM docs WHERE id = ?", id);
    }

    public void deleteBySpaceSlug(String spaceSlug) {
        jdbcTemplate.update("DELETE FROM docs WHERE space_slug = ?", spaceSlug);
    }

    public int countBySpaceSlug(String spaceSlug) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM docs WHERE space_slug = ?", Integer.class, spaceSlug);
        return count != null ? count : 0;
    }

    public int countPublishedBySpaceSlug(String spaceSlug) {
        Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM docs WHERE space_slug = ? AND status = 'published'", Integer.class, spaceSlug);
        return count != null ? count : 0;
    }

    public void saveSlugRedirect(String id, String kind, String spaceSlug, String oldSlug, String newSlug) {
        jdbcTemplate.update("""
            INSERT INTO slug_redirects (id, kind, space_slug, old_slug, new_slug)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET new_slug = EXCLUDED.new_slug
            """, id, kind, spaceSlug, oldSlug, newSlug);
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
