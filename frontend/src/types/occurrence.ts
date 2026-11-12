import { storage } from '../utils/storage';

// Occurrence/Incident Types
export interface Occurrence {
  id: string;
  user_id: string;
  date: string;
  time?: string;
  location: string;
  description: string;
  classification: string; // Typification
  status: 'rascunho' | 'em_analise' | 'concluido' | 'arquivado';
  photos: string[]; // Base64 images
  suspects: Person[];
  witnesses: Person[];
  victims: Person[]; // Lesados
  created_at?: string;
  updated_at?: string;
}

export type DocumentType = 'cartao_cidadao' | 'passaporte' | 'titulo_residencia' | 'carta_conducao';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cartao_cidadao: 'Cartão de Cidadão',
  passaporte: 'Passaporte',
  titulo_residencia: 'Título de Residência',
  carta_conducao: 'Carta de Condução',
};

export type PersonRole = 'suspeito' | 'testemunha' | 'lesado';

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  suspeito: 'Suspeito',
  testemunha: 'Testemunha',
  lesado: 'Lesado/Vítima',
};

export interface Person {
  id: string;
  role: PersonRole;
  full_name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string; // NIF
  nacionalidade?: string;
  naturalidade?: string;
  profissao?: string;
  habilitacoes_literarias?: string;
  estado_civil?: string;
  date_of_birth?: string;
  mother_name?: string;
  father_name?: string;
  document_type: DocumentType;
  document_number?: string;
  document_issue_date?: string;
  document_expiry_date?: string;
  photos: string[]; // Base64 images of ID or person
  notes?: string;
}

export const OCCURRENCE_CLASSIFICATIONS_STORAGE_KEY = 'occurrence_classifications';
export const DEFAULT_OCCURRENCE_CLASSIFICATIONS: string[] = [];

export const normalizeOccurrenceClassification = (value: string): string =>
  value.trim().replace(/\s+/g, ' ');

export const sortOccurrenceClassifications = (items: string[]): string[] =>
  [...items].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

export const getOccurrenceClassifications = async (): Promise<string[]> => {
  const raw = await storage.getItem(OCCURRENCE_CLASSIFICATIONS_STORAGE_KEY);

  if (!raw) {
    return [...DEFAULT_OCCURRENCE_CLASSIFICATIONS];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [...DEFAULT_OCCURRENCE_CLASSIFICATIONS];
    }

    const normalized = sortOccurrenceClassifications(
      [...new Set(parsed.map((item) => normalizeOccurrenceClassification(String(item))).filter(Boolean))],
    );
    return normalized;
  } catch {
    return [...DEFAULT_OCCURRENCE_CLASSIFICATIONS];
  }
};

export const saveOccurrenceClassifications = async (items: string[]): Promise<void> => {
  const normalized = sortOccurrenceClassifications(
    [...new Set(items.map((item) => normalizeOccurrenceClassification(String(item))).filter(Boolean))],
  );
  await storage.setItem(OCCURRENCE_CLASSIFICATIONS_STORAGE_KEY, JSON.stringify(normalized));
};

export const OCCURRENCE_CLASSIFICATIONS: string[] = DEFAULT_OCCURRENCE_CLASSIFICATIONS;

export const OCCURRENCE_STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  em_analise: 'Em Análise',
  concluido: 'Concluído',
  arquivado: 'Arquivado',
};

export const OCCURRENCE_STATUS_COLORS: Record<string, string> = {
  rascunho: '#6B7280',
  em_analise: '#F59E0B',
  concluido: '#10B981',
  arquivado: '#8B5CF6',
};
