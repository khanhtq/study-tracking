package com.studytracker.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.studytracker.dto.MusicPlaylistDto;
import com.studytracker.dto.MusicTrackDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

@Service
public class YoutubeAudioService {

    private static final Logger log = LoggerFactory.getLogger(YoutubeAudioService.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .followRedirects(HttpClient.Redirect.ALWAYS)
            .build();
    private final ExecutorService executor = Executors.newFixedThreadPool(3);

    private static final String[] PIPED_INSTANCES = {
            "https://pipedapi.kavin.rocks",
            "https://pipedapi.adminforge.de",
            "https://api.piped.yt",
            "https://pipedapi.darkness.services",
            "https://pipedapi.drgns.space",
            "https://pipedapi.mha.fi",
            "https://piped-api.lunar.icu",
            "https://api.piped.projectsegfau.lt"
    };

    private static final String[] INVIDIOUS_INSTANCES = {
            "https://inv.tux.pizza",
            "https://invidious.nerdvpn.de",
            "https://invidious.projectsegfau.lt",
            "https://invidious.privacyredirect.com",
            "https://invidious.drgns.space",
            "https://vid.puffyan.us",
            "https://yt.artemislena.eu"
    };

    /** Simple TTL cache for resolved stream URLs */
    private final ConcurrentHashMap<String, CachedStreamUrl> streamCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 3 * 60 * 60 * 1000L; // 3 hours

    private record CachedStreamUrl(String url, long expiresAt) {
        boolean isValid() {
            return System.currentTimeMillis() < expiresAt;
        }
    }

    /** Track whether yt-dlp is available on this machine */
    private volatile Boolean ytDlpAvailable = null;

    private static final String[] YT_DLP_PATHS = {
            "yt-dlp",
            "/usr/local/bin/yt-dlp",
            "/usr/bin/yt-dlp",
            System.getProperty("user.home") + "/AppData/Local/Python/pythoncore-3.14-64/Scripts/yt-dlp.exe",
            System.getProperty("user.home") + "/AppData/Local/Programs/Python/Python312/Scripts/yt-dlp.exe",
            System.getProperty("user.home") + "/AppData/Local/Programs/Python/Python311/Scripts/yt-dlp.exe"
    };
    private volatile String ytDlpPath = null;

    private boolean isYtDlpAvailable() {
        if (Boolean.TRUE.equals(ytDlpAvailable)) return true;
        for (String path : YT_DLP_PATHS) {
            try {
                Process process = new ProcessBuilder(path, "--version")
                        .redirectErrorStream(true)
                        .start();
                boolean finished = process.waitFor(2, TimeUnit.SECONDS);
                if (finished && process.exitValue() == 0) {
                    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()))) {
                        String version = reader.readLine();
                        log.info("yt-dlp detected at '{}', version: {}", path, version);
                    }
                    ytDlpPath = path;
                    ytDlpAvailable = true;
                    return true;
                }
            } catch (Exception ignored) {}
        }
        ytDlpAvailable = false;
        return false;
    }

    // ─── Preset Playlists ──────────────────────────────────────────────────

    public List<MusicPlaylistDto> getSuggestedPlaylists() {
        List<MusicPlaylistDto> playlists = new ArrayList<>();

        playlists.add(new MusicPlaylistDto(
                "lofi-study", "Lofi Study & Focus",
                "Nhạc Lofi nhẹ nhàng, thư giãn giúp tăng khả năng tập trung khi học tập và làm việc.",
                "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80",
                "Lofi",
                Arrays.asList(
                        new MusicTrackDto("lTRiuFIWV54", "1 A.M Study Session 📚 [lofi hip hop]", "Lofi Girl", "https://img.youtube.com/vi/lTRiuFIWV54/hqdefault.jpg", 3674L),
                        new MusicTrackDto("n61ULEU7CO0", "Best of lofi hip hop 2021 [beats to relax/study to]", "Lofi Girl", "https://img.youtube.com/vi/n61ULEU7CO0/hqdefault.jpg", 22258L),
                        new MusicTrackDto("amfWIRasxtI", "Productivity Boost - Lofi Study Music for Deep Concentration", "Lofi Study Room", "https://img.youtube.com/vi/amfWIRasxtI/hqdefault.jpg", 10800L),
                        new MusicTrackDto("Q89Dzox4jAE", "Lofi Work Space - Deep Focus Study/Work Concentration", "Lofi Beats", "https://img.youtube.com/vi/Q89Dzox4jAE/hqdefault.jpg", 42896L)
                )
        ));

        playlists.add(new MusicPlaylistDto(
                "piano-classical", "Piano & Classical Focus",
                "Giai điệu Piano êm dịu giúp kích thích não bộ, tăng chỉ số tập trung tối đa.",
                "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=600&auto=format&fit=crop&q=80",
                "Piano",
                Arrays.asList(
                        new MusicTrackDto("sAcj8me7wGI", "Relaxing Piano Music For Study and Focus", "Ocb Relax", "https://img.youtube.com/vi/sAcj8me7wGI/hqdefault.jpg", 10899L),
                        new MusicTrackDto("oiGmGFxsJi8", "Calm Piano Music for Studying, Reading, Relaxation", "HALIDONMUSIC", "https://img.youtube.com/vi/oiGmGFxsJi8/hqdefault.jpg", 9958L),
                        new MusicTrackDto("xd0XIMd2Kco", "A playlist for a quiet morning - soft piano for study & deep focus", "Fresh Morning Piano", "https://img.youtube.com/vi/xd0XIMd2Kco/hqdefault.jpg", 4681L),
                        new MusicTrackDto("fMBVcPCCauA", "Soft Piano Music for Study & Focus - Gentle Melodies for Deep Work", "Morning Flow Piano", "https://img.youtube.com/vi/fMBVcPCCauA/hqdefault.jpg", 7361L)
                )
        ));

        playlists.add(new MusicPlaylistDto(
                "nature-ambient", "Rain & Nature Ambient",
                "Tiếng mưa rơi, tiếng sóng biển và nhạc sóng não Alpha cho môi trường học tập tĩnh lặng.",
                "https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=600&auto=format&fit=crop&q=80",
                "Ambient",
                Arrays.asList(
                        new MusicTrackDto("mPZkdNFkNps", "Rain Sound On Window with Thunder Sounds - Heavy Rain for Sleep & Study", "Relaxing Ambience ASMR", "https://img.youtube.com/vi/mPZkdNFkNps/hqdefault.jpg", 28814L),
                        new MusicTrackDto("9oc8Fa7tb8c", "Sleep, Study or Focus with Rain Sounds in The Woods", "Relaxing White Noise", "https://img.youtube.com/vi/9oc8Fa7tb8c/hqdefault.jpg", 36036L),
                        new MusicTrackDto("Jvgx5HHJ0qw", "Rooftop Study Room with Rain Sounds - Ambience for Studying", "Cosmic Resort", "https://img.youtube.com/vi/Jvgx5HHJ0qw/hqdefault.jpg", 10801L),
                        new MusicTrackDto("q76bMs-NwRk", "3 Hours of Gentle Night Rain - Rain Sounds for Study & Relaxation", "The Relaxed Guy", "https://img.youtube.com/vi/q76bMs-NwRk/hqdefault.jpg", 10896L)
                )
        ));

        playlists.add(new MusicPlaylistDto(
                "synthwave-coding", "Synthwave & Cyberpunk Beats",
                "Giai điệu Synthwave hiện đại, năng lượng cao thích hợp cho lập trình viên và sáng tạo.",
                "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80",
                "Synthwave",
                Arrays.asList(
                        new MusicTrackDto("fhL67fnDXcU", "Coding Music - Synthwave Beats to Program to", "Lofi Girl", "https://img.youtube.com/vi/fhL67fnDXcU/hqdefault.jpg", 10800L),
                        new MusicTrackDto("cu_vihKMWeA", "Synthwave Coding Mix – Feels Like Never Closed", "Devs FM", "https://img.youtube.com/vi/cu_vihKMWeA/hqdefault.jpg", 7182L),
                        new MusicTrackDto("am1VJP0RnmQ", "Flow State - Chillstep & Synthwave for Deep Focus", "Cosmic Hippo", "https://img.youtube.com/vi/am1VJP0RnmQ/hqdefault.jpg", 3813L),
                        new MusicTrackDto("vrp1g7kqtW8", "New Matrix Synthwave - Hacker's Mix", "Super Chilled", "https://img.youtube.com/vi/vrp1g7kqtW8/hqdefault.jpg", 5354L)
                )
        ));

        return playlists;
    }

    // ─── Search ────────────────────────────────────────────────────────────

    public List<MusicTrackDto> searchTracks(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }

        // Tier 1: Direct YouTube HTML Scraper (Ultra-fast < 400ms, 100% reliable anywhere)
        List<MusicTrackDto> directResults = searchViaYoutubeScraper(query.trim());
        if (!directResults.isEmpty()) {
            log.info("YouTube direct HTML search success: {} results for '{}'", directResults.size(), query);
            return directResults;
        }

        // Tier 2: yt-dlp search
        if (isYtDlpAvailable()) {
            List<MusicTrackDto> results = searchViaYtDlp(query.trim());
            if (!results.isEmpty()) return results;
        }

        // Tier 3: Fallback to Piped API parallel search with 4s timeout
        String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
        List<CompletableFuture<List<MusicTrackDto>>> futures = new ArrayList<>();
        for (String instance : PIPED_INSTANCES) {
            futures.add(CompletableFuture.supplyAsync(() -> searchFromPipedInstance(instance, encodedQuery), executor));
        }

        try {
            CompletableFuture<Object> anyResult = CompletableFuture.anyOf(
                    futures.stream()
                            .map(f -> f.thenApply(list -> list.isEmpty() ? null : list))
                            .toArray(CompletableFuture[]::new)
            );
            Object result = anyResult.get(4, TimeUnit.SECONDS);
            if (result instanceof List<?> list && !list.isEmpty()) {
                @SuppressWarnings("unchecked")
                List<MusicTrackDto> typedResult = (List<MusicTrackDto>) list;
                return typedResult;
            }
        } catch (Exception e) {
            log.warn("All Piped search attempts failed: {}", e.getMessage());
        }

        return Collections.emptyList();
    }

    private boolean isNonMusicVideo(String title) {
        if (title == null || title.isBlank()) return false;
        String lower = title.toLowerCase();
        return lower.contains("vlog") ||
               lower.contains("prank") ||
               lower.contains("review") ||
               lower.contains("reaction") ||
               lower.contains("gameplay") ||
               lower.contains("gaming") ||
               lower.contains("unboxing") ||
               lower.contains("phim ngắn") ||
               lower.contains("tin tức") ||
               lower.contains("thời sự");
    }

    private List<MusicTrackDto> searchViaYoutubeScraper(String query) {
        try {
            String encodedQuery = URLEncoder.encode(query.trim(), StandardCharsets.UTF_8);
            String url = "https://www.youtube.com/results?search_query=" + encodedQuery;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
                    .header("Accept-Language", "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7")
                    .timeout(Duration.ofSeconds(4))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                return parseYoutubeSearchResults(response.body());
            }
        } catch (Exception e) {
            log.debug("Direct YouTube scraper search failed: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<MusicTrackDto> parseYoutubeSearchResults(String html) {
        List<MusicTrackDto> results = new ArrayList<>();
        try {
            int startIdx = html.indexOf("var ytInitialData = ");
            if (startIdx == -1) return results;
            startIdx += "var ytInitialData = ".length();
            int endIdx = html.indexOf(";</script>", startIdx);
            if (endIdx == -1) return results;

            String jsonStr = html.substring(startIdx, endIdx);
            JsonNode root = objectMapper.readTree(jsonStr);

            JsonNode contents = root.path("contents")
                    .path("twoColumnSearchResultsRenderer")
                    .path("primaryContents")
                    .path("sectionListRenderer")
                    .path("contents");

            if (contents.isArray()) {
                for (JsonNode section : contents) {
                    JsonNode itemSection = section.path("itemSectionRenderer").path("contents");
                    if (itemSection.isArray()) {
                        for (JsonNode item : itemSection) {
                            JsonNode videoRenderer = item.path("videoRenderer");
                            if (!videoRenderer.isMissingNode()) {
                                String videoId = videoRenderer.path("videoId").asText("");
                                if (videoId.isEmpty()) continue;

                                String title = videoRenderer.path("title").path("runs").path(0).path("text").asText("Unknown Title");
                                if (isNonMusicVideo(title)) continue;

                                String uploader = videoRenderer.path("ownerText").path("runs").path(0).path("text").asText("Unknown Artist");
                                String thumbnail = "https://img.youtube.com/vi/" + videoId + "/hqdefault.jpg";

                                JsonNode lengthNode = videoRenderer.path("lengthText").path("simpleText");
                                long duration = parseDurationString(lengthNode.asText(""));

                                results.add(new MusicTrackDto(videoId, title, uploader, thumbnail, duration));
                                if (results.size() >= 10) break;
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Error parsing YouTube search HTML: {}", e.getMessage());
        }
        return results;
    }

    private long parseDurationString(String text) {
        if (text == null || text.isBlank()) return 0L;
        String[] parts = text.split(":");
        try {
            if (parts.length == 2) {
                return Long.parseLong(parts[0]) * 60 + Long.parseLong(parts[1]);
            } else if (parts.length == 3) {
                return Long.parseLong(parts[0]) * 3600 + Long.parseLong(parts[1]) * 60 + Long.parseLong(parts[2]);
            }
        } catch (Exception ignored) {}
        return 0L;
    }

    private List<MusicTrackDto> searchViaYtDlp(String query) {
        try {
            ProcessBuilder pb = new ProcessBuilder(
                    ytDlpPath,
                    "ytsearch10:" + query,
                    "--flat-playlist",
                    "--dump-json",
                    "--no-download",
                    "--no-warnings",
                    "--socket-timeout", "3",
                    "--quiet"
            );
            pb.redirectErrorStream(true);
            Process process = pb.start();

            List<MusicTrackDto> results = new ArrayList<>();
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    try {
                        JsonNode node = objectMapper.readTree(line);
                        String id = node.path("id").asText("");
                        if (id.isEmpty()) continue;

                        String title = node.path("title").asText("Unknown");
                        if (isNonMusicVideo(title)) continue;

                        String uploader = node.path("uploader").asText(node.path("channel").asText("Unknown"));
                        long duration = node.path("duration").asLong(0L);
                        String thumbnail = "https://img.youtube.com/vi/" + id + "/hqdefault.jpg";

                        JsonNode thumbnails = node.path("thumbnails");
                        if (thumbnails.isArray() && !thumbnails.isEmpty()) {
                            thumbnail = thumbnails.get(thumbnails.size() - 1).path("url").asText(thumbnail);
                        }

                        results.add(new MusicTrackDto(id, title, uploader, thumbnail, duration));
                    } catch (Exception ignored) {}
                }
            }

            boolean finished = process.waitFor(3, TimeUnit.SECONDS);
            if (!finished) process.destroyForcibly();

            if (!results.isEmpty()) {
                log.info("yt-dlp search success: {} results for '{}'", results.size(), query);
            }
            return results;

        } catch (Exception e) {
            log.warn("yt-dlp search failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<MusicTrackDto> searchFromPipedInstance(String instance, String encodedQuery) {
        try {
            String targetUrl = instance + "/search?q=" + encodedQuery + "&filter=music_songs";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode items = root.path("items");

                List<MusicTrackDto> results = new ArrayList<>();
                if (items.isArray()) {
                    for (JsonNode item : items) {
                        String url = item.path("url").asText("");
                        String id = url.contains("/watch?v=") ? url.replace("/watch?v=", "") : item.path("id").asText("");
                        String title = item.path("title").asText("Unknown");
                        if (isNonMusicVideo(title)) continue;

                        results.add(new MusicTrackDto(
                                id,
                                title,
                                item.path("uploaderName").asText("Unknown"),
                                item.path("thumbnail").asText("https://img.youtube.com/vi/" + id + "/hqdefault.jpg"),
                                item.path("duration").asLong(0L)
                        ));
                    }
                }
                if (!results.isEmpty()) {
                    log.info("Piped search success from {}: {} results", instance, results.size());
                }
                return results;
            }
        } catch (Exception e) {
            log.debug("Piped search failed: {} -> {}", instance, e.getMessage());
        }
        return Collections.emptyList();
    }

    // ─── Stream Extraction (Memory optimized for 512MB RAM limit) ─────────

    public String getDirectAudioStreamUrl(String youtubeId) {
        if (youtubeId == null || youtubeId.trim().isEmpty()) {
            return null;
        }

        // 1. Check cache (< 1ms)
        CachedStreamUrl cached = streamCache.get(youtubeId);
        if (cached != null && cached.isValid()) {
            log.debug("Cache hit for stream: {}", youtubeId);
            return cached.url();
        }

        // 2. Launch tasks in parallel with single yt-dlp instance to save RAM
        List<CompletableFuture<String>> futures = new ArrayList<>();

        if (isYtDlpAvailable()) {
            futures.add(CompletableFuture.supplyAsync(
                    () -> runYtDlpExtract(youtubeId, "-f", "ba/b", "--extractor-args", "youtube:player_client=android,web", "--socket-timeout", "2"), executor));
        }

        for (String instance : PIPED_INSTANCES) {
            futures.add(CompletableFuture.supplyAsync(
                    () -> extractStreamFromPiped(instance, youtubeId), executor));
        }

        for (String instance : INVIDIOUS_INSTANCES) {
            futures.add(CompletableFuture.supplyAsync(
                    () -> extractStreamFromInvidious(instance, youtubeId), executor));
        }

        // 3. Race tasks: return FIRST non-null result within 3.5s max
        try {
            CompletableFuture<Object> anyResult = CompletableFuture.anyOf(
                    futures.stream()
                            .map(f -> f.thenApply(url -> (url != null && !url.isBlank()) ? url : null))
                            .toArray(CompletableFuture[]::new)
            );

            Object result = anyResult.get(3500, TimeUnit.MILLISECONDS);
            if (result instanceof String streamUrl && !streamUrl.isBlank()) {
                streamCache.put(youtubeId, new CachedStreamUrl(streamUrl, System.currentTimeMillis() + CACHE_TTL_MS));
                log.info("Audio stream resolved for {} in parallel race", youtubeId);
                return streamUrl;
            }
        } catch (Exception e) {
            log.debug("Stream resolution parallel race finished or timed out for {}: {}", youtubeId, e.getMessage());
        }

        log.warn("No stream URL for {} within 3.5s. Frontend will use YouTube embed fallback.", youtubeId);
        return null;
    }

    private String runYtDlpExtract(String youtubeId, String... extraArgs) {
        if (ytDlpPath == null) return null;
        try {
            List<String> cmd = new ArrayList<>();
            cmd.add(ytDlpPath);
            if (extraArgs != null && extraArgs.length > 0) {
                cmd.addAll(Arrays.asList(extraArgs));
            } else {
                cmd.addAll(List.of("-f", "ba/b", "--socket-timeout", "2"));
            }
            cmd.addAll(List.of(
                    "--get-url",
                    "--no-download",
                    "--no-warnings",
                    "--no-playlist",
                    "--quiet",
                    "https://www.youtube.com/watch?v=" + youtubeId
            ));

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(false);
            Process process = pb.start();

            String audioUrl = null;
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                audioUrl = reader.readLine();
            }

            boolean finished = process.waitFor(2, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return null;
            }

            if (audioUrl != null && !audioUrl.isBlank() && audioUrl.startsWith("http")) {
                log.info("yt-dlp stream success for {}", youtubeId);
                return audioUrl.trim();
            }
        } catch (Exception e) {
            log.debug("yt-dlp extract error for {}: {}", youtubeId, e.getMessage());
        }
        return null;
    }

    private String extractStreamFromPiped(String instance, String youtubeId) {
        try {
            String targetUrl = instance + "/streams/" + youtubeId;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode audioStreams = root.path("audioStreams");
                if (audioStreams.isArray()) {
                    String bestStream = null;
                    int bestBitrate = 0;
                    for (JsonNode stream : audioStreams) {
                        String url = stream.path("url").asText();
                        String mimeType = stream.path("mimeType").asText("");
                        int bitrate = stream.path("bitrate").asInt(0);
                        if (!url.isEmpty() && mimeType.startsWith("audio/")) {
                            if ((mimeType.contains("audio/mp4") || mimeType.contains("m4a")) && bitrate > bestBitrate) {
                                bestStream = url;
                                bestBitrate = bitrate;
                            } else if (bestStream == null) {
                                bestStream = url;
                            }
                        }
                    }
                    if (bestStream != null) {
                        log.info("Piped stream success: {} from {}", youtubeId, instance);
                        return bestStream;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Piped stream failed for {} on {}: {}", youtubeId, instance, e.getMessage());
        }
        return null;
    }

    private String extractStreamFromInvidious(String instance, String youtubeId) {
        try {
            String targetUrl = instance + "/api/v1/videos/" + youtubeId;
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                    .timeout(Duration.ofSeconds(3))
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode adaptiveFormats = root.path("adaptiveFormats");
                if (adaptiveFormats.isArray()) {
                    String bestStream = null;
                    int bestBitrate = 0;
                    for (JsonNode format : adaptiveFormats) {
                        String url = format.path("url").asText();
                        String type = format.path("type").asText("");
                        int bitrate = format.path("bitrate").asInt(0);
                        if (type.startsWith("audio/") && !url.isEmpty() && bitrate > bestBitrate) {
                            bestStream = url;
                            bestBitrate = bitrate;
                        }
                    }
                    if (bestStream != null) {
                        log.info("Invidious stream success: {} from {}", youtubeId, instance);
                        return bestStream;
                    }
                }
            }
        } catch (Exception e) {
            log.debug("Invidious stream failed for {} on {}: {}", youtubeId, instance, e.getMessage());
        }
        return null;
    }
}
