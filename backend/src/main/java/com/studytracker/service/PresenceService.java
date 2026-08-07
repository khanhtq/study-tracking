package com.studytracker.service;

import com.studytracker.dto.PresenceBatchDTO;
import com.studytracker.dto.PresenceCheckDTO;
import com.studytracker.model.PresenceLog;
import com.studytracker.model.StudySession;
import com.studytracker.model.User;
import com.studytracker.repository.PresenceLogRepository;
import com.studytracker.repository.StudySessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PresenceService {

    private final PresenceLogRepository presenceLogRepository;
    private final StudySessionRepository studySessionRepository;

    @Transactional
    public int saveBatchPresenceLogs(User currentUser, PresenceBatchDTO batchDTO) {
        if (batchDTO == null || batchDTO.getSessionId() == null || batchDTO.getChecks() == null || batchDTO.getChecks().isEmpty()) {
            return 0;
        }

        StudySession session = studySessionRepository.findById(batchDTO.getSessionId())
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + batchDTO.getSessionId()));

        if (!session.getUser().getId().equals(currentUser.getId())) {
            throw new IllegalArgumentException("Unauthorized session access for presence batch");
        }

        List<PresenceLog> logsToSave = new ArrayList<>();
        for (PresenceCheckDTO check : batchDTO.getChecks()) {
            if (check.getPresent() != null && check.getTimestamp() != null) {
                PresenceLog log = PresenceLog.builder()
                        .user(currentUser)
                        .session(session)
                        .present(check.getPresent())
                        .timestamp(check.getTimestamp())
                        .build();
                logsToSave.add(log);
            }
        }

        if (!logsToSave.isEmpty()) {
            presenceLogRepository.saveAll(logsToSave);
        }

        return logsToSave.size();
    }
}
