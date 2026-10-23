package com.infovergne.home.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * Représente un fichier média (image, vidéo, etc.).
 */
@Data
@Table("media")
public class Media {
    @Id
    private String id;
    private String url;
    private String name;
    private Integer width;
    private Integer height;
    private OffsetDateTime createdAt;
}
