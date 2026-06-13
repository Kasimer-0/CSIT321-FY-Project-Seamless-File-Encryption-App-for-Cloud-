package com.stealthsync.service.ai;

import com.stealthsync.model.entity.SystemLog;
import org.springframework.stereotype.Service;

@Service
/** Applies explainable demo rules that flag suspicious system-log activity for administrators. */
public class AnomalyDetectorService {

    public boolean isSuspicious(SystemLog log) {
        if (log == null || log.getAction() == null) {
            return false;
        }
        return log.isSuspicious() || log.getAction().toLowerCase().contains("bulk");
    }
}
