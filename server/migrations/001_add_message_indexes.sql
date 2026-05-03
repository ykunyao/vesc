USE chat_app;

ALTER TABLE messages
    ADD INDEX idx_messages_sender_id (sender_id),
    ADD INDEX idx_messages_created_at (created_at);
