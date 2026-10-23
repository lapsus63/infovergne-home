package com.infovergne.home.model;

import lombok.Data;
import java.util.List;

/**
 * Représente un espace (wiki ou blog).
 */
@Data
public class Space {

    private String id;
    private String slug;
    private String name;
    private String type; // wiki, blog
    private String description;
    private String accent;
    private String visibility; // public, restricted
    private List<String> allowedRoles;
    private List<String> writeRoles;
    private Integer position;
}
