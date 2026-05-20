package com.stealthsync.service.cloud;

import org.springframework.stereotype.Service;

import java.io.InputStream;

@Service
public class DropboxService implements CloudStorageAdapter {

    @Override
    public String upload(String filename, InputStream content) {
        throw new UnsupportedOperationException("Dropbox integration is not connected yet.");
    }

    @Override
    public InputStream download(String fileId) {
        throw new UnsupportedOperationException("Dropbox integration is not connected yet.");
    }

    @Override
    public void delete(String fileId) {
        throw new UnsupportedOperationException("Dropbox integration is not connected yet.");
    }
}
