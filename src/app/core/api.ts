export const API_URL = '/api';

export interface ApiResponse<T> {
  dados: T;
}

export interface ApiPage<T> extends ApiResponse<T[]> {
  paginacao: {
    pagina: number;
    tamanho: number;
    totalElementos: number;
    totalPaginas: number;
  };
}

export interface Page<T> {
  items: T[];
  hasNext: boolean;
}

export function toPage<T, R>(response: ApiPage<T>, mapItem: (item: T) => R): Page<R> {
  const { pagina, totalPaginas } = response.paginacao;
  return { items: response.dados.map(mapItem), hasNext: pagina + 1 < totalPaginas };
}
