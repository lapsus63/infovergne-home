package com.infovergne.home.service;

import com.infovergne.home.model.AppEntry;
import com.infovergne.home.model.Doc;
import com.infovergne.home.model.Space;
import com.infovergne.home.repository.AppRepository;
import com.infovergne.home.repository.DocRepository;
import com.infovergne.home.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final SpaceRepository spaceRepository;
    private final DocRepository docRepository;
    private final AppRepository appRepository;

    public record SearchResult(String kind, String title, String href, String context, String snippet, double score) {}

    public List<SearchResult> search(String query, List<String> userRoles, boolean isAdmin) {
        if (query == null || query.trim().length() < 2) return List.of();
        String q = query.trim();

        List<Space> spaces = spaceRepository.findAll();
        Map<String, Space> spaceBySlug = new java.util.HashMap<>();
        for (Space s : spaces) spaceBySlug.put(s.getSlug(), s);

        List<SearchResult> results = new ArrayList<>();

        // Docs
        for (Doc doc : docRepository.findAll()) {
            Space space = spaceBySlug.get(doc.getSpaceSlug());
            if (space == null) continue;
            if (!isAccessible(space, userRoles, isAdmin)) continue;
            if (!"published".equals(doc.getStatus())) continue;
            double score = score(q, doc.getTitle(), doc.getTags(), doc.getExcerpt() + " " + doc.getBody());
            if (score > 0.45) {
                String href = "/" + ("blog".equals(space.getType()) ? "blog" : "wiki") + "/" + doc.getSpaceSlug() + "/" + doc.getSlug();
                results.add(new SearchResult(space.getType(), doc.getTitle(), href, space.getName(), snippet(q, doc.getExcerpt()), score));
            }
        }

        // Apps
        for (AppEntry app : appRepository.findAll()) {
            if (!isAccessible(app.getVisibility(), app.getAllowedRoles(), userRoles, isAdmin)) continue;
            double score = score(q, app.getName(), app.getTags(), app.getDescription());
            if (score > 0.45) {
                results.add(new SearchResult("app", app.getName(), app.getUrl(), app.getCategory(), snippet(q, app.getDescription()), score));
            }
        }

        return results.stream().sorted((a, b) -> Double.compare(b.score(), a.score())).limit(30).toList();
    }

    private boolean isAccessible(Space space, List<String> userRoles, boolean isAdmin) {
        return isAccessible(space.getVisibility(), space.getAllowedRoles(), userRoles, isAdmin);
    }

    private boolean isAccessible(String visibility, List<String> allowedRoles, List<String> userRoles, boolean isAdmin) {
        if ("public".equals(visibility)) return true;
        if (isAdmin) return true;
        if (allowedRoles == null || allowedRoles.isEmpty()) return true;
        return userRoles.stream().anyMatch(r -> allowedRoles.contains(r.toUpperCase()));
    }

    private double score(String query, String title, List<String> tags, String body) {
        String q = normalize(query);
        String[] terms = q.split("\\s+");
        if (terms.length == 0) return 0;
        double total = 0;
        for (String term : terms) {
            double best = 0;
            best = Math.max(best, fieldScore(term, normalize(title)) * 6);
            best = Math.max(best, fieldScore(term, normalize(String.join(" ", tags))) * 3);
            best = Math.max(best, fieldScore(term, normalize(body)));
            total += best;
        }
        return total / terms.length;
    }

    private double fieldScore(String term, String field) {
        if (field.contains(term)) return 1.0;
        for (String token : field.split("\\s+")) {
            if (token.startsWith(term) && term.length() >= 3) return 0.85;
        }
        return 0;
    }

    private String normalize(String value) {
        if (value == null) return "";
        return value.toLowerCase()
            .replaceAll("[àáâãäå]", "a").replaceAll("[èéêë]", "e")
            .replaceAll("[ìíîï]", "i").replaceAll("[òóôõö]", "o")
            .replaceAll("[ùúûü]", "u").replaceAll("[^a-z0-9\\s]", " ")
            .replaceAll("\\s+", " ").trim();
    }

    private String snippet(String query, String text) {
        if (text == null || text.isBlank()) return "";
        int idx = text.toLowerCase().indexOf(query.toLowerCase().substring(0, Math.min(4, query.length())));
        int start = Math.max(0, idx < 0 ? 0 : idx - 60);
        String s = text.substring(start, Math.min(text.length(), start + 220)).trim();
        if (start > 0) s = "… " + s;
        return s;
    }
}
