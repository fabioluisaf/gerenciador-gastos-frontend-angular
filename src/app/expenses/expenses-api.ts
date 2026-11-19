import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { API_URL, ApiPage, ApiResponse, Page, toPage } from '../core/api';
import {
  Expense,
  ExpenseFilter,
  ExpenseKind,
  ExpensePeriod,
  Institution,
  InstallmentPart,
  MonthTotals,
  PAYMENT_TYPE_ORDER,
  PaymentTotalLine,
  PaymentType,
  TotalLine,
} from './expense';
import { parsePeriodKey } from './timeline';

interface InstitutionDto {
  id: string;
  nome: string;
  possuiIcone: boolean;
  cor: string | null;
}

interface ExpenseDto {
  id: string;
  data: string | null;
  nome: string;
  valor: number;
  categoria: string;
  descricao: string | null;
  realizado: boolean;
  metodoPagamento: {
    tipo: PaymentType;
    instituicaoFinanceira: InstitutionDto;
  };
  parcela?: {
    numero: number;
    quantidade: number;
    compraParceladaId: string;
    valorTotalCompra: number;
  };
}

interface InstallmentPurchaseDto {
  parcelas: {
    numeroParcela: number;
    valor: number;
    fatura: { dataVencimento: string } | null;
  }[];
}

interface CategoryTotalDto {
  categoria: string;
  realizado: number;
  planejado: number;
}

interface PaymentTotalDto {
  metodoPagamentoId: string;
  nome: string;
  tipo: PaymentType;
  instituicaoFinanceira: InstitutionDto;
  realizado: number;
  planejado: number;
}

interface PeriodDto {
  ano: number | null;
  mes: number | null;
  quantidade: number;
}

const TOTALS_PAGE_SIZE = 200;

const LIST_URLS: Readonly<Record<ExpenseKind, string>> = {
  realized: `${API_URL}/gastos`,
  planned: `${API_URL}/gastos/planejados`,
};

function toIsoDate(date: string | null): string | null {
  if (!date) {
    return null;
  }
  const [day, month, year] = date.split('/');
  return `${year}-${month}-${day}`;
}

function toInstitution(dto: InstitutionDto): Institution {
  return {
    id: dto.id,
    name: dto.nome,
    iconUrl: dto.possuiIcone ? `${API_URL}/instituicoes-financeiras/${dto.id}/icone` : null,
    color: dto.cor,
  };
}

function byLabel(a: TotalLine, b: TotalLine): number {
  return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
}

function byPaymentTypeThenName(a: PaymentTotalLine, b: PaymentTotalLine): number {
  return (
    PAYMENT_TYPE_ORDER.indexOf(a.paymentType) - PAYMENT_TYPE_ORDER.indexOf(b.paymentType) ||
    a.institution.name.localeCompare(b.institution.name, 'pt-BR') ||
    a.label.localeCompare(b.label, 'pt-BR')
  );
}

function toMonthTotals(categories: CategoryTotalDto[], payments: PaymentTotalDto[]): MonthTotals {
  const byCategory = categories
    .map(({ categoria, realizado, planejado }) => ({
      id: categoria,
      label: categoria,
      realized: realizado,
      planned: planejado,
    }))
    .sort(byLabel);
  return {
    realized: byCategory.reduce((sum, line) => sum + line.realized, 0),
    planned: byCategory.reduce((sum, line) => sum + line.planned, 0),
    byCategory,
    byPayment: payments
      .map((dto) => ({
        id: dto.metodoPagamentoId,
        label: dto.nome,
        realized: dto.realizado,
        planned: dto.planejado,
        paymentType: dto.tipo,
        institution: toInstitution(dto.instituicaoFinanceira),
      }))
      .sort(byPaymentTypeThenName),
  };
}

function toExpense(dto: ExpenseDto): Expense {
  return {
    id: dto.id,
    date: toIsoDate(dto.data),
    name: dto.nome,
    amount: dto.valor,
    category: dto.categoria,
    description: dto.descricao || null,
    realized: dto.realizado,
    paymentType: dto.metodoPagamento.tipo,
    institution: toInstitution(dto.metodoPagamento.instituicaoFinanceira),
    installment: dto.parcela
      ? {
          number: dto.parcela.numero,
          count: dto.parcela.quantidade,
          purchaseId: dto.parcela.compraParceladaId,
          purchaseAmount: dto.parcela.valorTotalCompra,
        }
      : null,
  };
}

function withFilters(params: HttpParams, filters: readonly ExpenseFilter[]): HttpParams {
  return filters.reduce(
    (current, filter) =>
      current.append(filter.kind === 'payment' ? 'metodoPagamentoId' : 'categoria', filter.id),
    params,
  );
}

@Injectable({ providedIn: 'root' })
export class ExpensesApi {
  private readonly http = inject(HttpClient);

  list(
    kind: ExpenseKind,
    page: number,
    size: number,
    filters: readonly ExpenseFilter[] = [],
  ): Observable<Page<Expense>> {
    const params = withFilters(new HttpParams().set('page', page).set('size', size), filters);
    return this.http
      .get<ApiPage<ExpenseDto>>(LIST_URLS[kind], { params })
      .pipe(map((response) => toPage(response, toExpense)));
  }

  listPeriods(
    kind: ExpenseKind,
    filters: readonly ExpenseFilter[] = [],
  ): Observable<ExpensePeriod[]> {
    return this.http
      .get<ApiResponse<PeriodDto[]>>(`${LIST_URLS[kind]}/periodos`, {
        params: withFilters(new HttpParams(), filters),
      })
      .pipe(
        map(({ dados }) =>
          dados.map(({ ano, mes, quantidade }) => ({ year: ano, month: mes, count: quantidade })),
        ),
      );
  }

  delete(expense: Expense): Observable<void> {
    const url = expense.installment
      ? `${API_URL}/compras-parceladas/${expense.installment.purchaseId}`
      : `${API_URL}/gastos/${expense.id}`;
    return this.http.delete<void>(url);
  }

  listInstallments(purchaseId: string): Observable<InstallmentPart[]> {
    return this.http
      .get<ApiResponse<InstallmentPurchaseDto>>(`${API_URL}/compras-parceladas/${purchaseId}`)
      .pipe(
        map(({ dados }) =>
          dados.parcelas
            .map(({ numeroParcela, valor, fatura }) => ({
              number: numeroParcela,
              amount: valor,
              invoiceDueDate: fatura?.dataVencimento ?? null,
            }))
            .sort((a, b) => a.number - b.number),
        ),
      );
  }

  getMonthTotals(periodKey: string): Observable<MonthTotals> {
    const { year, month } = parsePeriodKey(periodKey);
    const lastDay = new Date(year, month, 0).getDate();
    const params = new HttpParams()
      .set('inicio', `${periodKey}-01`)
      .set('fim', `${periodKey}-${lastDay}`)
      .set('size', TOTALS_PAGE_SIZE);
    return forkJoin([
      this.http.get<ApiPage<CategoryTotalDto>>(`${API_URL}/gastos/totais/categoria`, { params }),
      this.http.get<ApiPage<PaymentTotalDto>>(`${API_URL}/gastos/totais/metodo-pagamento`, {
        params,
      }),
    ]).pipe(map(([categories, payments]) => toMonthTotals(categories.dados, payments.dados)));
  }
}
