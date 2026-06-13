package com.stealthsync.service.cloud;

import java.io.InputStream;

/** Common provider contract reserved for interchangeable cloud upload/download implementations. */
public interface CloudStorageAdapter {

    String upload(String filename, InputStream content);

    InputStream download(String fileId);

    void delete(String fileId);
}
