# Configuração do n8n para Integração com Evolution API

## Formato do Payload Enviado pelo Sistema

O sistema envia o seguinte JSON para o webhook do n8n:

```json
{
  "instanceName": "user-82af4c91-1760496491812",
  "api_key": "EDA20E00-0647-4F30-B239-0D9B5C7FC193",
  "number": "556599999999",
  "text": "Olá João, sua mensagem aqui"
}
```

**IMPORTANTE:** O sistema agora suporta variações de mensagem! Cada contato pode receber uma variação diferente. O campo `text` já vem personalizado com o nome do cliente e a variação selecionada automaticamente pelo sistema (round-robin).

## Configuração do HTTP Request no n8n

### 1. Método
- **POST**

### 2. URL
```
http://evolution:8080/message/sendText/{{ $json.body.instanceName }}
```

### 3. Authentication
- **None** (usaremos header customizado)

### 4. Headers
Adicione o seguinte header:

| Name | Value |
|------|-------|
| apikey | `{{ $json.body.api_key }}` |

### 5. Body (JSON)

**IMPORTANTE: O formato correto para a Evolution API é:**

```json
{
  "number": "{{ $json.body.number }}",
  "text": "{{ $json.body.text }}"
}
```

**OU se a Evolution API exigir o formato com textMessage:**

```json
{
  "number": "{{ $json.body.number }}",
  "textMessage": {
    "text": "{{ $json.body.text }}"
  }
}
```

### 6. Options
- Body Content Type: **application/json**

## Sistema de Variações de Mensagem

### Como Funciona:

1. O usuário cria até 3 variações diferentes da mesma mensagem no frontend
2. O sistema alterna automaticamente entre as variações:
   - Cliente 1 → Variação 1
   - Cliente 2 → Variação 2
   - Cliente 3 → Variação 3
   - Cliente 4 → Variação 1 (volta ao início)
   - E assim por diante...
3. O campo `text` já chega no n8n com a variação correta e personalizada

### Por que usar variações?

- **Anti-Banimento:** Evita que o WhatsApp detecte envio da mesma mensagem repetidas vezes
- **Parece mais humano:** Cada cliente recebe uma mensagem ligeiramente diferente
- **Automático:** O sistema gerencia tudo, você só configura uma vez no n8n

## Sistema de Bloqueio (Opt-Out)

O sistema agora possui proteção contra banimento através de lista de bloqueio. Veja o arquivo `OPT_OUT_SETUP.md` para configurar o webhook que processa quando clientes pedem para sair.

## Verificação

Após configurar, teste com o seguinte payload de exemplo:

```json
{
  "instanceName": "user-test-123",
  "api_key": "sua-api-key-aqui",
  "number": "5565999999999",
  "text": "Mensagem de teste"
}
```

## Troubleshooting

### Erro 400 "Bad Request - instance requires property 'text'"

Isso acontece quando o formato do body JSON não está correto. Verifique:

1. O formato do body está **exatamente** como especificado acima
2. Os campos `number` e `text` estão no nível correto do JSON
3. Não há campos extras ou faltando

### Erro 401 "Unauthorized"

Isso acontece quando a apikey não está correta:

1. Verifique se o header `apikey` está configurado
2. Verifique se está usando `{{ $json.body.api_key }}` corretamente
3. Confirme que a api_key no banco de dados está correta

### Teste Manual da Evolution API

Você pode testar diretamente com curl:

```bash
curl -X POST \
  http://evolution:8080/message/sendText/user-82af4c91-1760496491812 \
  -H 'apikey: EDA20E00-0647-4F30-B239-0D9B5C7FC193' \
  -H 'Content-Type: application/json' \
  -d '{
    "number": "5565999999999",
    "text": "Teste de mensagem"
  }'
```

## Formato Alternativo (se o primeiro não funcionar)

Caso a Evolution API exija um formato diferente, tente:

```json
{
  "number": "{{ $json.body.number }}",
  "options": {
    "delay": 1200,
    "presence": "composing"
  },
  "textMessage": {
    "text": "{{ $json.body.text }}"
  }
}
```
