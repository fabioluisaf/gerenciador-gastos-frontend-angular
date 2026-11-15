import { PaymentType } from './expense-models';

export interface ApiResponse<T> {
  dados: T;
  versao: string;
}

export interface ApiPage<T> extends ApiResponse<T[]> {
  paginacao: { pagina: number; tamanho: number; totalElementos: number; totalPaginas: number };
}

export interface BackendPayment {
  id: string;
  tipo: PaymentType;
  instituicaoFinanceira: 'NUBANK' | 'CAIXA';
  nome: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
}

export interface BackendInvoice {
  id: string;
  dataFechamento: string;
  dataVencimento: string;
}

export interface BackendExpense {
  id: string;
  data: string | null;
  nome: string;
  valor: number;
  categoria: string;
  metodoPagamento: Pick<BackendPayment, 'tipo' | 'instituicaoFinanceira'> & Partial<BackendPayment>;
  descricao?: string | null;
  realizado: boolean;
  fatura?: BackendInvoice;
  parcela?: { numero: number; quantidade: number; compraParceladaId?: string };
}

export interface BackendPurchase {
  id: string;
  valorTotal: number;
  quantidadeParcelas: number;
  parcelas: {
    id: string;
    numeroParcela: number;
    data: string;
    valor: number;
    fatura: BackendInvoice;
    realizado: boolean;
  }[];
}

export interface BackendCategoryTotal {
  categoria: string;
  realizado: number;
  planejado: number;
}

export interface BackendPaymentTotal {
  metodoPagamentoId: string;
  instituicaoFinanceira: string;
  tipo: PaymentType;
  nome: string;
  realizado: number;
  planejado: number;
}
