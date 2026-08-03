package com.stealthsync.service;

import com.stealthsync.repository.CloudStorageLinkRepository;
import com.stealthsync.repository.EncryptedFileRecordRepository;
import com.stealthsync.repository.PlanRepository;
import com.stealthsync.repository.SubscriptionRepository;
import com.stealthsync.repository.SystemLogRepository;
import com.stealthsync.repository.UserAccountRepository;
import com.stealthsync.service.ai.AnomalyDetectorService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AdminReportsServiceTest {

    @Test
    void performanceReportDoesNotAdvertiseRemovedTicketFeature() {
        UserAccountRepository users = mock(UserAccountRepository.class);
        EncryptedFileRecordRepository files = mock(EncryptedFileRecordRepository.class);
        CloudStorageLinkRepository links = mock(CloudStorageLinkRepository.class);
        when(users.findAll()).thenReturn(List.of());
        when(links.findAll()).thenReturn(List.of());

        AdminReportsService service = new AdminReportsService(
                users,
                mock(SubscriptionRepository.class),
                mock(PlanRepository.class),
                files,
                links,
                mock(SystemLogRepository.class),
                mock(AnomalyDetectorService.class));

        Map<String, Object> report = service.performanceReport();

        assertFalse(report.containsKey("openTickets"));
    }
}
