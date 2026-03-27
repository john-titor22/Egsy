import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatDate(date, fmt = 'dd/MM/yyyy') {
  if (!date) return '-';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, fmt, { locale: fr });
  } catch {
    return '-';
  }
}

export function formatCurrency(amount, currency = 'MAD') {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('fr-MA', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) + ' ' + currency;
}

export function formatNumber(n) {
  if (n === undefined || n === null) return '-';
  return new Intl.NumberFormat('fr-FR').format(n);
}

export const PAYMENT_STATUS_LABELS = {
  PAYE: 'Payé',
  EN_ATTENTE: 'En attente',
  PARTIEL: 'Partiel',
};

export const PAYMENT_STATUS_COLORS = {
  PAYE: 'green',
  EN_ATTENTE: 'yellow',
  PARTIEL: 'blue',
};

export const FLOCK_PURPOSE_LABELS = {
  CHAIR: 'Poulet de chair',
  OEUF: 'Ponte',
};

export const FLOCK_STATUS_LABELS = {
  ACTIF: 'Actif',
  TERMINE: 'Terminé',
};

export const STOCK_CATEGORY_LABELS = {
  ALIMENT: 'Aliment',
  MEDICAMENT: 'Médicament',
  EQUIPEMENT: 'Équipement',
  AUTRE: 'Autre',
};
