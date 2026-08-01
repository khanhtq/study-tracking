package com.studytracker.controller;

import com.studytracker.dto.MusicPlaylistDto;
import com.studytracker.dto.MusicTrackDto;
import com.studytracker.service.YoutubeAudioService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/music")
@RequiredArgsConstructor
public class MusicController {

    private final YoutubeAudioService youtubeAudioService;

    @GetMapping("/playlists")
    public ResponseEntity<List<MusicPlaylistDto>> getSuggestedPlaylists() {
        return ResponseEntity.ok(youtubeAudioService.getSuggestedPlaylists());
    }

    @GetMapping("/search")
    public ResponseEntity<List<MusicTrackDto>> searchTracks(@RequestParam String query) {
        return ResponseEntity.ok(youtubeAudioService.searchTracks(query));
    }

    @GetMapping("/stream/{youtubeId}")
    public ResponseEntity<Map<String, Object>> getStreamInfo(@PathVariable String youtubeId) {
        String streamUrl = youtubeAudioService.getDirectAudioStreamUrl(youtubeId);
        Map<String, Object> response = new HashMap<>();
        response.put("youtubeId", youtubeId);
        response.put("streamUrl", streamUrl);
        response.put("success", streamUrl != null);
        return ResponseEntity.ok(response);
    }
}
