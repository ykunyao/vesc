USE chat_app;

CREATE TABLE IF NOT EXISTS conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('direct', 'group') NOT NULL,
    name VARCHAR(100),
    owner_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS conversation_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    conversation_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM('owner', 'admin', 'member') DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_conversation_user (conversation_id, user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation_members_user_id (user_id)
);

INSERT INTO conversations (type, name)
SELECT 'group', 'Vesc Lobby'
WHERE NOT EXISTS (
    SELECT 1 FROM conversations WHERE type = 'group' AND name = 'Vesc Lobby'
);

SET @default_conversation_id := (
    SELECT id FROM conversations
    WHERE type = 'group' AND name = 'Vesc Lobby'
    LIMIT 1
);

ALTER TABLE messages
    ADD COLUMN conversation_id INT NULL AFTER id;

UPDATE messages
SET conversation_id = @default_conversation_id
WHERE conversation_id IS NULL;

INSERT IGNORE INTO conversation_members (conversation_id, user_id, role)
SELECT @default_conversation_id, id, 'member'
FROM users;

ALTER TABLE messages
    MODIFY conversation_id INT NOT NULL,
    ADD CONSTRAINT fk_messages_conversation
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    ADD INDEX idx_messages_conversation_created_at (conversation_id, created_at);
