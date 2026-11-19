import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL, ApiPage, Page, toPage } from '../core/api';
import { Expense, PaymentType } from './expense';

interface InstitutionDto {
  id: string;
  nome: string;
  possuiIcone: boolean;
}

interface ExpenseDto {
  id: string;
  data: string;
  nome: string;
  valor: number;
  categoria: string;
  descricao: string | null;
  metodoPagamento: {
    tipo: PaymentType;
    instituicaoFinanceira: InstitutionDto;
  };
  parcela?: { numero: number; quantidade: number };
}

function toIsoDate(date: string): string {
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
}

function toExpense(dto: ExpenseDto): Expense {
  const institution = dto.metodoPagamento.instituicaoFinanceira;
  return {
    id: dto.id,
    date: toIsoDate(dto.data),
    name: dto.nome,
    amount: dto.valor,
    category: dto.categoria,
    description: dto.descricao || null,
    paymentType: dto.metodoPagamento.tipo,
    institution: {
      id: institution.id,
      name: institution.nome,
      iconUrl: institution.possuiIcone
        ? `${API_URL}/instituicoes-financeiras/${institution.id}/icone`
        : null,
    },
    installment: dto.parcela ? { number: dto.parcela.numero, total: dto.parcela.quantidade } : null,
  };
}

@Injectable({ providedIn: 'root' })
export class ExpensesApi {
  private readonly http = inject(HttpClient);

  listRealized(page: number, size: number): Observable<Page<Expense>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http
      .get<ApiPage<ExpenseDto>>(`${API_URL}/gastos`, { params })
      .pipe(map((response) => toPage(response, toExpense)));
  }
}
