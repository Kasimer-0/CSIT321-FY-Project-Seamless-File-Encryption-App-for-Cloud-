CREATE TABLE plans (
    plan_id BIGSERIAL PRIMARY KEY,
    enc_method VARCHAR(255) NOT NULL,
    plan_description VARCHAR(1000),
    plan_price DOUBLE PRECISION NOT NULL,
    plan_status VARCHAR(255) NOT NULL,
    plan_title VARCHAR(255) NOT NULL
);

CREATE TABLE user_accounts (
    user_id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(255) NOT NULL,
    is_subscribed BOOLEAN NOT NULL,
    subscription_id BIGINT,
    is_suspended BOOLEAN NOT NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    recovery_phrase_hash VARCHAR(255)
);

CREATE TABLE subscriptions (
    subscription_id BIGSERIAL PRIMARY KEY,
    subcription_start_date DATE NOT NULL,
    subcription_status VARCHAR(255) NOT NULL,
    subscription_end_date DATE NOT NULL,
    plan_id BIGINT NOT NULL REFERENCES plans(plan_id),
    subscriber_id BIGINT NOT NULL REFERENCES user_accounts(user_id)
);

CREATE TABLE cloud_storage_links (
    link_id BIGSERIAL PRIMARY KEY,
    account_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL,
    linked_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    owner_id BIGINT NOT NULL,
    provider VARCHAR(255) NOT NULL,
    status VARCHAR(255) NOT NULL,
    CONSTRAINT uk_cloud_storage_link_owner_provider UNIQUE (owner_id, provider)
);

CREATE TABLE cloud_provider_credentials (
    credential_id BIGSERIAL PRIMARY KEY,
    access_token VARCHAR(4096) NOT NULL,
    account_email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    owner_id BIGINT NOT NULL,
    provider VARCHAR(64) NOT NULL,
    refresh_token VARCHAR(4096),
    token_salt VARCHAR(64) NOT NULL,
    CONSTRAINT uk_cloud_provider_credential_owner_provider UNIQUE (provider, owner_id)
);

CREATE TABLE google_drive_credentials (
    credential_id BIGSERIAL PRIMARY KEY,
    access_token VARCHAR(4096) NOT NULL,
    account_email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    owner_id BIGINT NOT NULL UNIQUE,
    refresh_token VARCHAR(4096) NOT NULL,
    token_salt VARCHAR(64) NOT NULL
);

CREATE TABLE cloud_file_records (
    cloud_file_record_id BIGSERIAL PRIMARY KEY,
    algorithm VARCHAR(32) NOT NULL,
    ciphertext_size BIGINT NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    encrypted_metadata VARCHAR(16384) NOT NULL,
    envelope_version INTEGER NOT NULL,
    key_fingerprint VARCHAR(32) NOT NULL,
    object_name VARCHAR(128) NOT NULL,
    owner_id BIGINT NOT NULL,
    plaintext_size BIGINT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    remote_file_id VARCHAR(1024) NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    CONSTRAINT uk_cloud_file_owner_provider_remote UNIQUE (owner_id, provider, remote_file_id)
);

CREATE TABLE encrypted_files (
    file_id BIGSERIAL PRIMARY KEY,
    enc_method VARCHAR(255) NOT NULL,
    encrypted_content BYTEA,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(255) NOT NULL,
    key_id BIGINT NOT NULL,
    uploaded_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    owner_id BIGINT
);

CREATE TABLE encryption_keys (
    key_id BIGSERIAL PRIMARY KEY,
    algorithm VARCHAR(255) NOT NULL,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    fingerprint VARCHAR(255) NOT NULL,
    key_name VARCHAR(255) NOT NULL,
    key_scheme VARCHAR(80),
    ownerid BIGINT NOT NULL,
    password_verifier VARCHAR(128),
    salt VARCHAR(128),
    status VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    kdf_iterations INTEGER,
    kdf_version INTEGER
);

CREATE TABLE system_logs (
    log_id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255) NOT NULL,
    ai_risk_reason VARCHAR(1000),
    ip_address VARCHAR(255) NOT NULL,
    is_suspicious BOOLEAN NOT NULL,
    "timestamp" TIMESTAMP(6) WITHOUT TIME ZONE NOT NULL,
    username VARCHAR(255) NOT NULL,
    detector_version VARCHAR(64),
    device_identifier_hash VARCHAR(64),
    provider VARCHAR(64),
    risk_level VARCHAR(16),
    risk_score INTEGER,
    user_id BIGINT
);

CREATE TABLE user_devices (
    device_id BIGSERIAL PRIMARY KEY,
    is_active BOOLEAN NOT NULL,
    device_identifier_hash VARCHAR(64) NOT NULL,
    device_name VARCHAR(120) NOT NULL,
    first_seen_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    last_seen_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    owner_id BIGINT NOT NULL,
    platform VARCHAR(80) NOT NULL,
    is_primary BOOLEAN NOT NULL,
    revoked_at TIMESTAMP(6) WITH TIME ZONE,
    CONSTRAINT uk_user_device_owner_identifier UNIQUE (owner_id, device_identifier_hash)
);

CREATE TABLE user_vaults (
    vault_id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    key_scheme VARCHAR(255) NOT NULL,
    owner_id BIGINT NOT NULL,
    updated_at TIMESTAMP(6) WITH TIME ZONE NOT NULL,
    vault_salt VARCHAR(255) NOT NULL,
    wrapped_file_key VARCHAR(2048) NOT NULL,
    CONSTRAINT uk_user_vault_owner UNIQUE (owner_id)
);

-- Business reference data is required for registration and plan selection.
-- No demo users, subscriptions, cloud links, files, or credentials are seeded.
INSERT INTO plans (enc_method, plan_description, plan_price, plan_status, plan_title)
VALUES
    ('AES-128', 'AES-128 client-side encryption for one device and one cloud provider', 0.0, 'active', 'Basic Free Tier'),
    ('AES-256-GCM', 'AES-256-GCM client-side encryption for up to five devices and three cloud providers', 7.0, 'active', 'Premium Corporate Tier');
