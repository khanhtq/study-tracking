package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "system_preset_exams")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemPresetExam {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "exam_code", unique = true, nullable = false, length = 50)
    private String examCode;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "exam";

    @Column(name = "target_date", nullable = false)
    private Instant targetDate;

    @Column(name = "is_official_date", nullable = false)
    @Builder.Default
    private Boolean isOfficialDate = false;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    private String color = "indigo";

    @CreationTimestamp
    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
