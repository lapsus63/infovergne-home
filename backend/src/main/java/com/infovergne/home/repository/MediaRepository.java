package com.infovergne.home.repository;

import com.infovergne.home.model.Media;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class MediaRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<Media> ROW_MAPPER = (rs, rowNum) -> {
        Media media = new Media();
        media.setId(rs.getString("id"));
        media.setUrl(rs.getString("url"));
        media.setName(rs.getString("name"));
        media.setWidth(rs.getInt("width"));
        media.setHeight(rs.getInt("height"));
        var createdAt = rs.getTimestamp("created_at");
        if (createdAt != null) media.setCreatedAt(createdAt.toInstant().atOffset(java.time.ZoneOffset.UTC));
        return media;
    };

    public List<Media> findAll() {
        return jdbcTemplate.query("SELECT * FROM media ORDER BY created_at DESC", ROW_MAPPER);
    }

    public Optional<Media> findById(String id) {
        List<Media> results = jdbcTemplate.query("SELECT * FROM media WHERE id = ?", ROW_MAPPER, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public Media save(Media media) {
        jdbcTemplate.update("""
            INSERT INTO media (id, url, name, width, height, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url, name = EXCLUDED.name,
                width = EXCLUDED.width, height = EXCLUDED.height
            """, media.getId(), media.getUrl(), media.getName(), media.getWidth(), media.getHeight(), media.getCreatedAt());
        return media;
    }

    public void delete(String id) {
        jdbcTemplate.update("DELETE FROM media WHERE id = ?", id);
    }
}
