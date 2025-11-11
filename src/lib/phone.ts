/**
 * Utility functions for phone number normalization and formatting
 */

/**
 * Normaliza um número de telefone removendo caracteres especiais
 * e sufixos do WhatsApp
 * @param phone - Número de telefone a ser normalizado
 * @returns Número normalizado contendo apenas dígitos
 */
export const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  
  // Remove @s.whatsapp.net se existir
  let normalized = phone.replace(/@s\.whatsapp\.net/g, '');
  
  // Remove todos os caracteres não numéricos
  normalized = normalized.replace(/\D/g, '');
  
  return normalized;
};

/**
 * Formata um número de telefone brasileiro no padrão (XX) XXXXX-XXXX
 * @param phone - Número de telefone a ser formatado
 * @returns Número formatado
 */
export const formatPhone = (phone: string): string => {
  const normalized = normalizePhone(phone);
  
  if (normalized.length === 11) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  } else if (normalized.length === 10) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 6)}-${normalized.slice(6)}`;
  }
  
  return normalized;
};

/**
 * Valida se um número de telefone brasileiro é válido
 * @param phone - Número de telefone a ser validado
 * @returns true se o número é válido
 */
export const isValidPhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  return normalized.length >= 10 && normalized.length <= 11;
};
