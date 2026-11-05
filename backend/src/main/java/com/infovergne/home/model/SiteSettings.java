package com.infovergne.home.model;

import lombok.Data;

@Data
public class SiteSettings {
    private String memoDocId;
    private String siteTitle;
    private String siteTagline;
    private String backupCron;
    private Integer backupKeep;
}
