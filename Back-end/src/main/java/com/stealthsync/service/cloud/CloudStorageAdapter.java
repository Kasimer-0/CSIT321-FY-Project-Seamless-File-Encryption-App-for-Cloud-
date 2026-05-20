package com.stealthsync.service.cloud;

import java.io.InputStream;

public interface CloudStorageAdapter {

    String upload(String filename, InputStream content);

    InputStream download(String fileId);

    void delete(String fileId);
}
