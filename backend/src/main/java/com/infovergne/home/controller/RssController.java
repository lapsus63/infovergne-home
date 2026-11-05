package com.infovergne.home.controller;

import com.infovergne.home.service.RssService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rss")
@RequiredArgsConstructor
public class RssController {

    private final RssService rssService;

    @GetMapping(value = "/rss.xml", produces = "application/rss+xml;charset=UTF-8")
    public ResponseEntity<String> globalRss(HttpServletRequest request) {
        String origin = getOrigin(request);
        String xml = rssService.buildFeed(origin, null);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/rss+xml;charset=UTF-8"))
            .header("Cache-Control", "public, max-age=300").body(xml);
    }

    @GetMapping(value = "/{spaceSlug}.xml", produces = "application/rss+xml;charset=UTF-8")
    public ResponseEntity<String> spaceRss(@PathVariable String spaceSlug, HttpServletRequest request) {
        String origin = getOrigin(request);
        String xml = rssService.buildFeed(origin, spaceSlug);
        if (xml == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().contentType(MediaType.parseMediaType("application/rss+xml;charset=UTF-8"))
            .header("Cache-Control", "public, max-age=300").body(xml);
    }

    private String getOrigin(HttpServletRequest request) {
        String scheme = request.getScheme();
        String host = request.getServerName();
        int port = request.getServerPort();
        if ((scheme.equals("http") && port == 80) || (scheme.equals("https") && port == 443)) {
            return scheme + "://" + host;
        }
        return scheme + "://" + host + ":" + port;
    }
}
