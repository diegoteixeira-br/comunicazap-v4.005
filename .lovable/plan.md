
## Atualização do Texto do Banner de CPF/CNPJ

### Objetivo
Melhorar a mensagem do banner para explicar claramente ao usuário o motivo da solicitação do documento.

### Alteração

**Arquivo:** `src/pages/Dashboard.tsx`

**Texto atual:**
- Título: "Complete seu cadastro"
- Descrição: "Informe seu CPF ou CNPJ para continuar usando a plataforma."

**Novo texto:**
- Título: "Complete seu cadastro"
- Descrição: "Para garantir a segurança e evitar a criação de contas duplicadas, precisamos que você informe seu CPF ou CNPJ."

### Justificativa
O novo texto deixa claro para o usuário que:
1. É uma medida de segurança
2. O objetivo é evitar contas duplicadas (abuso do trial)
3. Mantém um tom profissional e transparente

### Detalhes Técnicos
Alteração simples de uma linha no componente do banner, modificando apenas o texto da tag `<p>` dentro do Card de aviso.
