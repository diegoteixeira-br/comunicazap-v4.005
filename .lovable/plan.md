

## Plano: Prevenção de Múltiplas Contas com CPF/CNPJ

### Problema Identificado
Usuários estão criando múltiplas contas com emails diferentes para aproveitar repetidamente o período de teste gratuito de 7 dias.

### Solução Proposta
Adicionar campo obrigatório de CPF ou CNPJ no cadastro, com validação única no banco de dados.

---

### 1. Alterações no Banco de Dados

**Adicionar coluna na tabela `profiles`:**
```sql
ALTER TABLE profiles 
ADD COLUMN document TEXT UNIQUE;

-- Índice para busca rápida
CREATE INDEX idx_profiles_document ON profiles(document);
```

A constraint `UNIQUE` garante que o mesmo documento não pode ser usado em contas diferentes.

---

### 2. Modificar Página de Cadastro (Auth.tsx)

**Adicionar campo de documento:**
- Novo campo "CPF ou CNPJ" abaixo do nome
- Máscara automática para formatação (XXX.XXX.XXX-XX ou XX.XXX.XXX/XXXX-XX)
- Validação do dígito verificador
- Radio buttons ou detecção automática para tipo de documento

**Fluxo de validação:**
1. Usuário digita documento
2. Frontend valida formato e dígito verificador
3. Antes do signup, verificar no banco se documento já existe
4. Se existir: mostrar erro "Este CPF/CNPJ já está cadastrado"
5. Se não existir: prosseguir com cadastro

---

### 3. Criar Funções de Validação (lib/document.ts)

```typescript
// Validar CPF
export const validateCPF = (cpf: string): boolean => {
  // Remove formatação
  // Valida dígitos verificadores
  // Retorna true/false
};

// Validar CNPJ
export const validateCNPJ = (cnpj: string): boolean => {
  // Remove formatação
  // Valida dígitos verificadores
  // Retorna true/false
};

// Máscara de formatação
export const formatDocument = (value: string): string => {
  // Detecta tipo e aplica máscara
};

// Detectar tipo
export const detectDocumentType = (value: string): 'cpf' | 'cnpj' | null;
```

---

### 4. Atualizar Trigger de Criação de Usuário

Modificar `handle_new_user()` para incluir o documento:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, document)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'document'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

### 5. Verificação Pré-Cadastro

**Nova função no Auth.tsx:**
```typescript
const checkDocumentExists = async (document: string): Promise<boolean> => {
  const cleanDoc = document.replace(/\D/g, '');
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('document', cleanDoc)
    .maybeSingle();
  return !!data;
};
```

**No handleAuth (signup):**
```typescript
// Verificar antes de criar conta
const exists = await checkDocumentExists(document);
if (exists) {
  toast({
    title: "Documento já cadastrado",
    description: "Este CPF/CNPJ já está vinculado a outra conta.",
    variant: "destructive"
  });
  return;
}

// Incluir documento nos metadados
await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: fullName,
      document: document.replace(/\D/g, '') // Salvar sem formatação
    }
  }
});
```

---

### 6. Atualizar ProfileSettingsModal

- Mostrar o documento cadastrado (somente leitura)
- Não permitir alteração após cadastro (segurança)

---

### 7. Interface do Formulário de Cadastro

```
┌─────────────────────────────────────┐
│           Criar Conta               │
├─────────────────────────────────────┤
│  Nome Completo                      │
│  ┌───────────────────────────────┐  │
│  │ João da Silva                 │  │
│  └───────────────────────────────┘  │
│                                     │
│  CPF ou CNPJ *                      │
│  ┌───────────────────────────────┐  │
│  │ 123.456.789-00                │  │
│  └───────────────────────────────┘  │
│  ℹ️ Usamos para evitar contas       │
│     duplicadas e garantir           │
│     segurança                       │
│                                     │
│  Email                              │
│  ┌───────────────────────────────┐  │
│  │ joao@email.com                │  │
│  └───────────────────────────────┘  │
│                                     │
│  Senha                              │
│  ┌───────────────────────────────┐  │
│  │ ••••••••                      │  │
│  └───────────────────────────────┘  │
│                                     │
│  ┌───────────────────────────────┐  │
│  │         CADASTRAR             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### Resumo das Alterações

| Componente | Alteração |
|------------|-----------|
| **Banco de dados** | Adicionar coluna `document` (UNIQUE) em `profiles` |
| **Auth.tsx** | Campo de CPF/CNPJ no cadastro com validação |
| **lib/document.ts** | Funções de validação e formatação de documentos |
| **handle_new_user()** | Salvar documento nos metadados do usuário |
| **ProfileSettingsModal** | Exibir documento cadastrado (somente leitura) |

### Benefícios
- Impede criação de múltiplas contas pela mesma pessoa
- Validação em duas camadas (frontend + banco de dados)
- CPF/CNPJ inválido é rejeitado antes mesmo de tentar cadastrar
- Documento duplicado é bloqueado pela constraint UNIQUE

### Considerações de Segurança
- O documento é armazenado sem formatação (apenas números)
- A verificação é case-insensitive
- RLS policies já protegem os dados (cada usuário só vê seu próprio perfil)

