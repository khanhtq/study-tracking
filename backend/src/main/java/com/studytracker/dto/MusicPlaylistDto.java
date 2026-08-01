package com.studytracker.dto;

import java.util.List;

public class MusicPlaylistDto {
    private String id;
    private String title;
    private String description;
    private String coverUrl;
    private String category;
    private List<MusicTrackDto> tracks;

    public MusicPlaylistDto() {}

    public MusicPlaylistDto(String id, String title, String description, String coverUrl, String category, List<MusicTrackDto> tracks) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.coverUrl = coverUrl;
        this.category = category;
        this.tracks = tracks;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCoverUrl() {
        return coverUrl;
    }

    public void setCoverUrl(String coverUrl) {
        this.coverUrl = coverUrl;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public List<MusicTrackDto> getTracks() {
        return tracks;
    }

    public void setTracks(List<MusicTrackDto> tracks) {
        this.tracks = tracks;
    }
}
