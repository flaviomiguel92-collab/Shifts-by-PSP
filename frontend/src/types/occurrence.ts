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
  document_type: DocumentType;
  document_number?: string;
  document_issue_date?: string;
  document_expiry_date?: string;
  photos: string[]; // Base64 images of ID or person
  notes?: string;
}

export const OCCURRENCE_CLASSIFICATIONS = [
  'Furto',
  'Roubo',
  'Agressão',
  'Dano',
  'Ameaça',
  'Injúria',
  'Acidente de Viação',
  'Violência Doméstica',
  'Burla',
  'Tráfico',
  'Posse de Arma',
  'Desordem Pública',
  'Vandalismo',
  'Outro',
];

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
