package com.stealthsync.service.ai;

import com.stealthsync.model.entity.SystemLog;
import org.springframework.stereotype.Service;

@Service
public class AnomalyDetectorService {

    public boolean isSuspicious(SystemLog log) {
        if (log == null || log.getAction() == null) {
            return false;
        }
        return log.isSuspicious() || log.getAction().toLowerCase().contains("bulk");
    }
}
