package com.infovergne.home.service;

import com.infovergne.home.model.SiteSettings;
import com.infovergne.home.model.Space;
import com.infovergne.home.repository.DocRepository;
import com.infovergne.home.repository.SettingsRepository;
import com.infovergne.home.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RssService {

    private final SpaceRepository spaceRepository;
    private final DocRepository docRepository;
    private final SettingsRepository settingsRepository;

    public String buildFeed(String origin, String spaceSlug) {
        List<Space> spaces = spaceRepository.findAll();
        SiteSettings settings = settingsRepository.load();

        List<Space> publicSpaces = spaces.stream().filter(s -> "public".equals(s.getVisibility())).toList();
        Space target = spaceSlug != null ? publicSpaces.stream().filter(s -> s.getSlug().equals(spaceSlug)).findFirst().orElse(null) : null;

        if (spaceSlug != null && target == null) return null;

        Set<String> allowedSlugs = (target != null ? List.of(target) : publicSpaces).stream()
            .map(Space::getSlug).collect(Collectors.toSet());
        Map<String, Space> spaceBySlug = spaces.stream().collect(Collectors.toMap(Space::getSlug, s -> s));

        String items = docRepository.findAll().stream()
            .filter(d -> allowedSlugs.contains(d.getSpaceSlug()) && "published".equals(d.getStatus()) && "public".equals(d.getVisibility()))
            .sorted((a, b) -> b.getPublishedAt().compareTo(a.getPublishedAt()))
            .limit(40)
            .map(doc -> {
                Space space = spaceBySlug.get(doc.getSpaceSlug());
                String link = origin + "/" + ("blog".equals(space.getType()) ? "blog" : "wiki") + "/" + doc.getSpaceSlug() + "/" + doc.getSlug();
                return """
                    <item>
                      <title>%s</title>
                      <link>%s</link>
                      <guid isPermaLink="true">%s</guid>
                      <pubDate>%s</pubDate>
                      <category>%s</category>
                      <description>%s</description>
                    </item>""".formatted(
                    escape(doc.getTitle()), escape(link), escape(link),
                    doc.getPublishedAt().format(DateTimeFormatter.RFC_1123_DATE_TIME),
                    escape(space.getName()), escape(doc.getExcerpt()));
            })
            .collect(Collectors.joining("\n"));

        String title = target != null ? settings.getSiteTitle() + " — " + target.getName() : settings.getSiteTitle();
        String feedUrl = target != null ? origin + "/api/rss/" + target.getSlug() + ".xml" : origin + "/api/rss/rss.xml";

        return """
            <?xml version="1.0" encoding="UTF-8"?>
            <rss version="2.0">
              <channel>
                <title>%s</title>
                <link>%s</link>
                <description>%s</description>
                <language>fr</language>
                <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="%s" rel="self" type="application/rss+xml" />
            %s
              </channel>
            </rss>""".formatted(escape(title), escape(origin), escape(settings.getSiteTagline()), escape(feedUrl), items);
    }

    private String escape(String v) {
        if (v == null) return "";
        return v.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
