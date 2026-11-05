package com.infovergne.home.model;

import lombok.Data;

import java.util.List;

@Data
public class Favorite {
    private String id;
    private String userId;
    private String label;
    private String href;
    private String kind; // app, wiki, blog, link
    private Integer position;
    private String category;
    private String description;
    private List<String> tags;
    private String visibility;
    private List<String> allowedRoles;
}
