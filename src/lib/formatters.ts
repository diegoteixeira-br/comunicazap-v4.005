import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata uma data no padrão brasileiro (dd/MM/yyyy HH:mm)
 * @param date - Data a ser formatada (string ISO, Date object ou timestamp)
 * @returns Data formatada
 */
export const formatDate = (date: string | Date | number): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateFnsFormat(dateObj, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  } catch {
    return 'Data inválida';
  }
};

/**
 * Formata uma data apenas com dia e mês (dd/MM)
 * @param date - Data a ser formatada
 * @returns Data formatada (dd/MM)
 */
export const formatDayMonth = (date: string | Date): string => {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateFnsFormat(dateObj, 'dd/MM', { locale: ptBR });
  } catch {
    return '--/--';
  }
};

/**
 * Formata um valor monetário em Real brasileiro
 * @param value - Valor a ser formatado
 * @returns Valor formatado (R$ X.XXX,XX)
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

/**
 * Trunca um texto longo adicionando reticências
 * @param text - Texto a ser truncado
 * @param maxLength - Comprimento máximo
 * @returns Texto truncado
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};
