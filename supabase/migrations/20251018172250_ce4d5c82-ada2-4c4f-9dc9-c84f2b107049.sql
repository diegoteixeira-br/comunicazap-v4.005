-- Criar tabela de contatos bloqueados (opt-out)
CREATE TABLE public.blocked_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.blocked_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para blocked_contacts
CREATE POLICY "Users can view own blocked contacts"
  ON public.blocked_contacts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blocked contacts"
  ON public.blocked_contacts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blocked contacts"
  ON public.blocked_contacts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Adicionar suporte para múltiplas variações de mensagem nas campanhas
ALTER TABLE public.message_campaigns
ADD COLUMN message_variations TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Adicionar coluna para rastrear qual variação foi usada em cada log
ALTER TABLE public.message_logs
ADD COLUMN message_variation_index INTEGER DEFAULT 0;

-- Criar índice para melhor performance nas buscas de bloqueio
CREATE INDEX idx_blocked_contacts_user_phone ON public.blocked_contacts(user_id, phone_number);