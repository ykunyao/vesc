USE chat_app;

ALTER TABLE conversations
    ADD COLUMN avatar_url VARCHAR(500) NULL AFTER name,
    ADD COLUMN announcement TEXT NULL AFTER avatar_url;
