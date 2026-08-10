package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "countdown_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CountdownEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "preset_exam_code", length = 50)
    private String presetExamCode;

    @Column(nullable = false)
    private String title;

    @Column(name = "target_date", nullable = false)
    private Instant targetDate;

    @Column(nullable = false, length = 50)
    @Builder.Default
    private String category = "custom";

    @Builder.Default
    private String color = "indigo";

    @Builder.Default
    private String icon = "calendar";

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "is_pinned", nullable = false)
    @Builder.Default
    private Boolean isPinned = false;

    @Column(name = "email_notify", nullable = false)
    @Builder.Default
    private Boolean emailNotify = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
