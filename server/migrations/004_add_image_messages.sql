USE chat_app;

ALTER TABLE messages
    ADD COLUMN message_type ENUM('text', 'image') NOT NULL DEFAULT 'text' AFTER content,
    ADD COLUMN media_url VARCHAR(500) NULL AFTER message_type;
