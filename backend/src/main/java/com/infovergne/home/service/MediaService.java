package com.infovergne.home.service;

import com.infovergne.home.exception.ResourceNotFoundException;
import com.infovergne.home.model.Media;
import com.infovergne.home.repository.MediaRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class MediaService {

    private final MediaRepository mediaRepository;
    private final AuditService auditService;

    @Value("${infovergne.home.uploads-dir:uploads}")
    private String uploadsDir;

    @Value("${infovergne.home.base-url:http://localhost:8080}")
    private String baseUrl;

    public List<Media> listAll() {
        return mediaRepository.findAll();
    }

    public Media upload(MultipartFile file, String name, int width, int height, String userId) throws IOException {
        String ext = getExtension(file.getOriginalFilename());
        String uuid = UUID.randomUUID().toString();
        String subDir = uuid.substring(0, 2);
        Path dir = Paths.get(uploadsDir, subDir);
        Files.createDirectories(dir);
        Path filePath = dir.resolve(uuid + "." + ext);
        file.transferTo(filePath);

        Media media = new Media();
        media.setId(uuid);
        media.setName(name != null && !name.isBlank() ? name : file.getOriginalFilename());
        media.setUrl(baseUrl + "/uploads/" + subDir + "/" + uuid + "." + ext);
        media.setWidth(width);
        media.setHeight(height);
        media.setCreatedAt(OffsetDateTime.now());
        Media saved = mediaRepository.save(media);
        auditService.log(userId, "CREATE", "media", saved.getId(), null);
        return saved;
    }

    public void delete(String id, String userId) {
        Media media = mediaRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Media not found: " + id));
        // Supprimer le fichier physique
        try {
            String urlPath = media.getUrl().replaceFirst("^.*/uploads/", "");
            Path filePath = Paths.get(uploadsDir, urlPath);
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            log.warn("Could not delete file for media {}: {}", id, e.getMessage());
        }
        mediaRepository.delete(id);
        auditService.log(userId, "DELETE", "media", id, null);
    }

    private String getExtension(String filename) {
        if (filename == null || !filename.contains(".")) return "bin";
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }
}
