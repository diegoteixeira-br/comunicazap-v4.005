# Configuração do Sistema de Opt-Out (Lista de Bloqueio)

## Como Funciona

O sistema agora possui um endpoint que processa automaticamente quando um cliente pede para sair da lista de mensagens. Quando alguém responde com palavras como "NÃO", "SAIR", "PARAR", "CANCELAR", o número é adicionado à lista de bloqueio e não receberá mais mensagens.

## Configuração do n8n

### 1. Adicionar Novo Endpoint no Workflow "Receptor de Mensagens"

No seu workflow do n8n que já recebe os eventos `messages.upsert` da Evolution API, adicione um novo nó HTTP Request logo após o Webhook que recebe as mensagens.

### 2. Configurar o HTTP Request para Opt-Out

**Método:** POST

**URL:**
```
https://pxzvpnshhulrsjbeqqhn.supabase.co/functions/v1/process-opt-out
```

**Authentication:** None (usaremos header customizado)

**Headers:**

| Name | Value |
|------|-------|
| Content-Type | application/json |
| Authorization | Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4enZwbnNoaHVscnNqYmVxcWhuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA0NDI4NjcsImV4cCI6MjA3NjAxODg2N30.c5RTN2Js4EWa0CyuopkXGZ7Q6JW7t6vKJhzlNmD5P9c |

**Body (JSON):**
```json
{
  "instanceName": "{{ $json.body.instance }}",
  "sender": "{{ $json.body.data.key.remoteJid }}",
  "message": "{{ $json.body.data.message.conversation || $json.body.data.message.extendedTextMessage?.text }}"
}
```

### 3. Palavras que Acionam o Opt-Out

O sistema reconhece as seguintes palavras (case-insensitive):
- não
- nao
- sair
- parar
- cancelar
- stop
- remover

## Fluxo Completo

1. Cliente responde sua mensagem com "NÃO" ou "SAIR"
2. Evolution API envia evento `messages.upsert` para o n8n
3. n8n extrai os dados e chama o endpoint `process-opt-out`
4. O sistema verifica se a mensagem contém palavra de opt-out
5. Se sim, adiciona o número à tabela `blocked_contacts` do banco de dados
6. **Importante:** Nas próximas campanhas, o sistema automaticamente pula contatos bloqueados

## Verificação no Sistema

### Como saber se está funcionando:

1. **Teste Manual:**
   - Envie uma mensagem para um número de teste
   - Responda com "NÃO" ou "SAIR"
   - Verifique nos logs do n8n se a requisição foi feita
   - Tente enviar outra campanha - o número não deve receber

2. **Logs no Supabase:**
   - Abra o Lovable Cloud (backend)
   - Vá em "Functions" → "process-opt-out" → "Logs"
   - Você verá mensagens como "Opt-out detected, adding to blocked list"

3. **Banco de Dados:**
   - Abra o Lovable Cloud (backend)
   - Vá em "Table Editor" → "blocked_contacts"
   - Você verá os números bloqueados listados

## Mensagens de Opt-in Recomendadas

Para seus clientes, sempre inclua uma opção de saída clara:

**Exemplo 1:**
```
Olá {nome}! 

Espero que esteja tudo bem com você!

Estamos atualizando nossa lista de contatos e gostaríamos de saber se você deseja continuar recebendo nossas mensagens.

Por favor, responda:
✅ SIM - para continuar recebendo
❌ NÃO - para não receber mais

Obrigado pela atenção! 🙏
```

**Exemplo 2:**
```
Oi {nome}! Você gostaria de continuar recebendo nossas mensagens? 

Responda SIM ou NÃO. Obrigado!
```

## Troubleshooting

### O número não foi bloqueado:

1. Verifique se o n8n está executando o workflow
2. Confira se os campos do JSON estão corretos (instanceName, sender, message)
3. Verifique os logs da função `process-opt-out` no Lovable Cloud
4. Confirme que a palavra usada está na lista de opt-out

### Erro 401 (Unauthorized):

- Verifique se o header `Authorization` está correto
- Confirme que está usando o token fornecido acima

### Como remover um número da lista de bloqueio:

1. Abra o Lovable Cloud (backend)
2. Vá em "Table Editor" → "blocked_contacts"
3. Encontre o registro do número
4. Clique em "Delete" (ícone de lixeira)
