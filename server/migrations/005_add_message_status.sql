USE chat_app;

ALTER TABLE messages
    ADD COLUMN status ENUM('normal', 'deleted', 'revoked') NOT NULL DEFAULT 'normal' AFTER media_url,
    ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at;
