package com.stealthsync.service.cloud;

import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
/** Prototype OneDrive adapter; remote file I/O is intentionally not implemented yet. */
public class OneDriveService implements CloudStorageAdapter {

    @Override
    public String upload(String filename, InputStream content) {
        throw new UnsupportedOperationException("OneDrive integration is not connected yet.");
    }

    @Override
    public InputStream download(String fileId) {
        throw new UnsupportedOperationException("OneDrive integration is not connected yet.");
    }

    @Override
    public void delete(String fileId) {
        throw new UnsupportedOperationException("OneDrive integration is not connected yet.");
    }
}
