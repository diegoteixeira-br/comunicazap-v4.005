export interface MessageTemplate {
  id: string;
  title: string;
  message: string;
  category: "saudacao" | "lembrete" | "promocao" | "agradecimento" | "opt-in" | "personalizado";
  isCustom: boolean;
  createdAt?: string;
}

export const getDefaultTemplates = (): MessageTemplate[] => [
  {
    id: "opt-in-completo",
    title: "Opt-in - Confirmação de Interesse Completo",
    message: `Olá {nome}! 👋

Espero que esteja tudo bem com você!

Estamos atualizando nossa lista de contatos e gostaríamos de saber se você deseja continuar recebendo nossas mensagens.

Por favor, responda:
✅ SIM - para continuar recebendo
❌ NÃO - para não receber mais

Obrigado pela atenção! 🙏`,
    category: "opt-in",
    isCustom: false,
  },
  {
    id: "opt-in-simplificado",
    title: "Opt-in - Confirmação Simplificada",
    message: "Oi {nome}! Você gostaria de continuar recebendo nossas mensagens? Responda SIM ou NÃO. Obrigado!",
    category: "opt-in",
    isCustom: false,
  },
  {
    id: "confirmacao-interesse",
    title: "Confirmação de Interesse",
    message: "{nome}, confirmamos que você deseja receber nossas atualizações? Digite SIM para confirmar ou NÃO para cancelar.",
    category: "opt-in",
    isCustom: false,
  },
  {
    id: "saudacao-formal",
    title: "Saudação Formal",
    message: "Olá {nome}, tudo bem? Espero que esteja tendo um ótimo dia!",
    category: "saudacao",
    isCustom: false,
  },
  {
    id: "saudacao-informal",
    title: "Saudação Informal",
    message: "Oi {nome}! 😊 Como você está?",
    category: "saudacao",
    isCustom: false,
  },
  {
    id: "lembrete-agendamento",
    title: "Lembrete de Agendamento",
    message: "Olá {nome}! Este é um lembrete sobre seu agendamento. Por favor, confirme sua presença. Obrigado!",
    category: "lembrete",
    isCustom: false,
  },
  {
    id: "promocao-oferta",
    title: "Promoção/Oferta",
    message: "🎁 {nome}, temos uma oferta especial para você! Aproveite nossos descontos exclusivos.",
    category: "promocao",
    isCustom: false,
  },
  {
    id: "agradecimento",
    title: "Agradecimento",
    message: "Muito obrigado {nome}! Sua confiança é muito importante para nós. 💚",
    category: "agradecimento",
    isCustom: false,
  },
];

export const getCustomTemplates = (): MessageTemplate[] => {
  try {
    const stored = localStorage.getItem("whatsapp-custom-templates");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Erro ao carregar templates personalizados:", error);
    return [];
  }
};

export const getAllTemplates = (): MessageTemplate[] => {
  return [...getDefaultTemplates(), ...getCustomTemplates()];
};

export const saveCustomTemplate = (template: MessageTemplate): void => {
  try {
    const existing = getCustomTemplates();
    
    // Limite de 50 templates personalizados
    if (existing.length >= 50) {
      throw new Error("Limite de 50 templates personalizados atingido");
    }
    
    const updated = [...existing, template];
    localStorage.setItem("whatsapp-custom-templates", JSON.stringify(updated));
  } catch (error) {
    console.error("Erro ao salvar template:", error);
    throw error;
  }
};

export const deleteCustomTemplate = (templateId: string): void => {
  try {
    const existing = getCustomTemplates();
    const filtered = existing.filter(t => t.id !== templateId);
    localStorage.setItem("whatsapp-custom-templates", JSON.stringify(filtered));
  } catch (error) {
    console.error("Erro ao excluir template:", error);
    throw error;
  }
};

export const getCategoryIcon = (category: MessageTemplate["category"]): string => {
  switch (category) {
    case "opt-in": return "✅";
    case "saudacao": return "👋";
    case "lembrete": return "📅";
    case "promocao": return "🎁";
    case "agradecimento": return "💚";
    case "personalizado": return "✏️";
    default: return "📝";
  }
};

export const getCategoryLabel = (category: MessageTemplate["category"]): string => {
  switch (category) {
    case "opt-in": return "Opt-in";
    case "saudacao": return "Saudação";
    case "lembrete": return "Lembrete";
    case "promocao": return "Promoção";
    case "agradecimento": return "Agradecimento";
    case "personalizado": return "Personalizado";
    default: return "Outros";
  }
};
