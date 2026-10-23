package com.infovergne.home.model;

import lombok.Data;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * Représente une application Docker.
 */
@Data
public class AppEntry {

    private String id;
    private String slug;
    private String name;
    private String description;
    private String category;
    private String url;
    private List<String> tags;
    private String containerName;
    private String visibility; // public, restricted
    private List<String> allowedRoles;
    private String state; // running, stopped, error, unknown
    private OffsetDateTime stateAt;
}
