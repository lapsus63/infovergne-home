package com.infovergne.home.repository;

import com.infovergne.home.model.Category;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
@RequiredArgsConstructor
public class CategoryRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final RowMapper<Category> ROW_MAPPER = (rs, rowNum) -> {
        Category cat = new Category();
        cat.setId(rs.getString("id"));
        cat.setName(rs.getString("name"));
        cat.setPosition(rs.getInt("position"));
        return cat;
    };

    public List<Category> findAll() {
        return jdbcTemplate.query("SELECT * FROM categories ORDER BY lower(name)", ROW_MAPPER);
    }

    public Optional<Category> findById(String id) {
        List<Category> results = jdbcTemplate.query("SELECT * FROM categories WHERE id = ?", ROW_MAPPER, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    public boolean existsByNameIgnoreCase(String name) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM categories WHERE lower(name) = lower(?)", Integer.class, name);
        return count != null && count > 0;
    }

    public boolean existsByNameIgnoreCaseAndIdNot(String name, String excludeId) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM categories WHERE lower(name) = lower(?) AND id != ?", Integer.class, name, excludeId);
        return count != null && count > 0;
    }

    public int maxPosition() {
        Integer max = jdbcTemplate.queryForObject("SELECT COALESCE(MAX(position), 0) FROM categories", Integer.class);
        return max != null ? max : 0;
    }

    public Category save(Category category) {
        jdbcTemplate.update("""
            INSERT INTO categories (id, name, position) VALUES (?, ?, ?)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, position = EXCLUDED.position
            """, category.getId(), category.getName(), category.getPosition());
        return category;
    }

    public void delete(String id) {
        jdbcTemplate.update("DELETE FROM categories WHERE id = ?", id);
    }
}
