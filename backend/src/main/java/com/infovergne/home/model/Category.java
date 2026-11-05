package com.infovergne.home.model;

import lombok.Data;

@Data
public class Category {
    private String id;
    private String name;
    private Integer position;
    private Integer appsCount;
    private Integer favoritesCount;
}
