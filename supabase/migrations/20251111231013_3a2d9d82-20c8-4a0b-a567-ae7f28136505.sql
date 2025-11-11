-- Adicionar índices para melhorar performance de queries
-- Índice GIN para busca eficiente em tags (arrays)
CREATE INDEX IF NOT EXISTS idx_contacts_user_tags ON contacts USING GIN (tags);

-- Índice para busca eficiente de aniversários
CREATE INDEX IF NOT EXISTS idx_contacts_birthday ON contacts (birthday) WHERE birthday IS NOT NULL;

-- Índice composto para logs de mensagens por campanha e status
CREATE INDEX IF NOT EXISTS idx_message_logs_campaign_status ON message_logs (campaign_id, status);

-- Índice para ordenação de campanhas por usuário e data
CREATE INDEX IF NOT EXISTS idx_campaigns_user_date ON message_campaigns (user_id, created_at DESC);

-- Índice para status de instâncias WhatsApp por usuário
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_user_status ON whatsapp_instances (user_id, status);

-- Índice para contatos bloqueados por usuário
CREATE INDEX IF NOT EXISTS idx_blocked_contacts_user_phone ON blocked_contacts (user_id, phone_number);