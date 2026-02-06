

## Diagnóstico do Problema

O cliente **JN Construção e Acabamento** (ti@jncac.com.br) está bloqueado apesar de ter assinatura ativa porque:

### Causa Raiz
O campo `current_period_end` na tabela `user_subscriptions` está **NULL**:

| Campo | Valor | Status |
|-------|-------|--------|
| status | `active` | ✅ |
| stripe_subscription_id | `sub_1SwqoxPFVcRfSdEaMUDDCOTY` | ✅ |
| current_period_end | `NULL` | ❌ **PROBLEMA** |
| document (CNPJ) | `58241855000194` | ✅ |

### Por que isso bloqueia?

O hook `useSubscription` verifica:
```text
subscribed = status === 'active' 
           AND current_period_end existe 
           AND current_period_end > agora
```

Como `current_period_end` é NULL, a verificação falha.

---

## Plano de Correção

### Passo 1: Correção Imediata (Desbloquear o Cliente)

Atualizar o registro no banco com o `current_period_end` correto baseado nos dados do Stripe:
- Próxima fatura: 3 de março de 2026
- Definir: `current_period_end = '2026-03-03'`

### Passo 2: Corrigir a Sincronização

A edge function `check-subscription` já foi re-deployada. Quando o cliente fizer login novamente, a função irá:
1. Consultar o Stripe
2. Encontrar a assinatura ativa
3. Atualizar automaticamente o `current_period_end`

### Passo 3 (Opcional - Recomendado): Criar Webhook do Stripe

Para garantir que isso não aconteça novamente, implementar um webhook que recebe eventos do Stripe:
- `checkout.session.completed` → Ativa a assinatura
- `customer.subscription.updated` → Atualiza período
- `customer.subscription.deleted` → Cancela assinatura

---

## Detalhes Técnicos

### SQL para correção imediata:
```text
UPDATE user_subscriptions 
SET 
  current_period_end = '2026-03-03T00:00:00+00:00',
  current_period_start = '2026-02-03T00:00:00+00:00',
  updated_at = NOW()
WHERE user_id = '7b22fedb-1bc6-4d3e-a0cf-97f5974612dd';
```

### Arquivos envolvidos:
- `supabase/functions/check-subscription/index.ts` - Já deployada
- `src/hooks/useSubscription.tsx` - Lógica de verificação (não precisa alterar)
- Novo arquivo (opcional): `supabase/functions/stripe-webhook/index.ts`

