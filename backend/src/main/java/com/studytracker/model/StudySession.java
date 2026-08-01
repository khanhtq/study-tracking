package com.studytracker.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "study_sessions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudySession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    private String subject;

    @Column(nullable = false)
    private Instant startedAt;

    private Instant endedAt;

    private Integer durationSeconds;

    private Integer xpEarned;

    private Instant lastHeartbeatAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SessionSource source;

    private String studyMethod;

    private Integer targetDurationSeconds;

    private Boolean isCompleted;

    @CreationTimestamp
    @Column(updatable = false)
    private Instant createdAt;
}
