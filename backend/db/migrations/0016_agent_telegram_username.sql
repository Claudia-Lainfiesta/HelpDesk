ALTER TABLE users ADD COLUMN telegram_username text
  CONSTRAINT users_telegram_username_check CHECK (telegram_username ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$');
COMMENT ON COLUMN users.telegram_username IS 'Usuario público de Telegram configurado por el administrador, sin @; no es un ID numérico ni un vínculo verificado por el bot.';
