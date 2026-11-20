import { API_URL } from '../core/api';
import { Institution } from './expense';

export interface InstitutionDto {
  id: string;
  nome: string;
  possuiIcone: boolean;
  cor: string | null;
}

export function toInstitution(dto: InstitutionDto): Institution {
  return {
    id: dto.id,
    name: dto.nome,
    iconUrl: dto.possuiIcone ? `${API_URL}/instituicoes-financeiras/${dto.id}/icone` : null,
    color: dto.cor,
  };
}
