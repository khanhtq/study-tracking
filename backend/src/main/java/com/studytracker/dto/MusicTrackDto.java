package com.studytracker.dto;

public class MusicTrackDto {
    private String id;
    private String title;
    private String uploader;
    private String thumbnailUrl;
    private Long durationSeconds;
    private String streamUrl;

    public MusicTrackDto() {}

    public MusicTrackDto(String id, String title, String uploader, String thumbnailUrl, Long durationSeconds) {
        this.id = id;
        this.title = title;
        this.uploader = uploader;
        this.thumbnailUrl = thumbnailUrl;
        this.durationSeconds = durationSeconds;
    }

    public MusicTrackDto(String id, String title, String uploader, String thumbnailUrl, Long durationSeconds, String streamUrl) {
        this.id = id;
        this.title = title;
        this.uploader = uploader;
        this.thumbnailUrl = thumbnailUrl;
        this.durationSeconds = durationSeconds;
        this.streamUrl = streamUrl;
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

    public String getUploader() {
        return uploader;
    }

    public void setUploader(String uploader) {
        this.uploader = uploader;
    }

    public String getThumbnailUrl() {
        return thumbnailUrl;
    }

    public void setThumbnailUrl(String thumbnailUrl) {
        this.thumbnailUrl = thumbnailUrl;
    }

    public Long getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Long durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getStreamUrl() {
        return streamUrl;
    }

    public void setStreamUrl(String streamUrl) {
        this.streamUrl = streamUrl;
    }
}
