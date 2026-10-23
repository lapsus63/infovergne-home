package com.infovergne.home.model;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Représente un document (page wiki ou article blog).
 */
@Data
public class Doc {

    private String id;
    private String spaceSlug;
    private String slug;
    private String title;
    private String excerpt;
    private String body;
    private List<String> tags;
    private String status; // draft, published, archived
    private String visibility; // public, restricted
    private List<String> allowedRoles;
    private String author;
    private OffsetDateTime publishedAt;
    private OffsetDateTime updatedAt;
}
