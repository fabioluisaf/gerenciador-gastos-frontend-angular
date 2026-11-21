import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { API_URL, ApiPage, ApiResponse, Page, toPage } from '../core/api';
import {
  byPaymentTypeThenUsage,
  Expense,
  ExpenseFilter,
  FilteredTotals,
  ExpenseKind,
  ExpensePeriod,
  InstallmentPart,
  MonthTotals,
  NewExpense,
  PaymentType,
  TotalLine,
} from './expense';
import { PaymentUsage, PaymentUsageApi } from '../payment-methods/payment-usage-api';
import { InstitutionDto, toInstitution } from './institution-dto';
import { parsePeriodKey } from './timeline';

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
  dataVencimentoFatura?: string;
}

interface InstallmentPurchaseDto {
  parcelas: {
    numeroParcela: number;
    valor: number;
    fatura: { dataVencimento: string } | null;
  }[];
}

interface InvoiceDto {
  dataFechamento: string;
}

interface ExpenseDetailDto {
  data: string | null;
  nome: string;
  valor: number;
  categoria: string;
  metodoPagamento: { id: string };
  fatura: InvoiceDto | null;
  descricao: string | null;
  realizado: boolean;
}

interface PurchaseDetailDto {
  nome: string;
  categoria: string;
  metodoPagamento: { id: string };
  descricao: string | null;
  valorTotal: number;
  quantidadeParcelas: number;
  parcelas: {
    numeroParcela: number;
    valor: number;
    data: string;
    fatura: InvoiceDto | null;
    realizado: boolean;
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

function byLabel(a: TotalLine, b: TotalLine): number {
  return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
}

function toMonthTotals(
  categories: CategoryTotalDto[],
  payments: PaymentTotalDto[],
  usage: PaymentUsage,
): MonthTotals {
  const byUsage = byPaymentTypeThenUsage(usage);
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
      .sort((a, b) => byUsage(a, b) || a.label.localeCompare(b.label, 'pt-BR')),
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
    invoiceDueDate: toIsoDate(dto.dataVencimentoFatura ?? null),
  };
}

const FILTER_PARAMS: Readonly<Record<ExpenseFilter['kind'], string>> = {
  payment: 'metodoPagamentoId',
  category: 'categoria',
  name: 'nome',
};

function withFilters(params: HttpParams, filters: readonly ExpenseFilter[]): HttpParams {
  return filters.reduce(
    (current, filter) => current.append(FILTER_PARAMS[filter.kind], filter.id),
    params,
  );
}

function parcelAmounts({ installmentAmounts }: NewExpense): { valoresParcelas?: number[] } {
  return installmentAmounts ? { valoresParcelas: installmentAmounts } : {};
}

function monthParams(periodKey: string): HttpParams {
  const { year, month } = parsePeriodKey(periodKey);
  const lastDay = new Date(year, month, 0).getDate();
  return new HttpParams().set('inicio', `${periodKey}-01`).set('fim', `${periodKey}-${lastDay}`);
}

@Injectable({ providedIn: 'root' })
export class ExpensesApi {
  private readonly http = inject(HttpClient);
  private readonly usage = inject(PaymentUsageApi);

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

  create(expense: NewExpense): Observable<void> {
    const common = {
      nome: expense.name,
      categoria: expense.category,
      metodoPagamentoId: expense.paymentMethodId,
      data: expense.date,
      descricao: expense.description,
      faturaPeriodo: expense.invoicePeriod,
    };
    const request =
      expense.installments > 1
        ? this.http.post(`${API_URL}/compras-parceladas`, {
            ...common,
            valorTotal: expense.amount,
            quantidadeParcelas: expense.installments,
            ...parcelAmounts(expense),
            realizado: expense.realized,
          })
        : this.http.post(`${API_URL}/gastos`, {
            ...common,
            valor: expense.amount,
            realizado: expense.realized,
          });
    return request.pipe(map(() => undefined));
  }

  loadForEdit(expense: Expense): Observable<NewExpense> {
    const purchaseId = expense.installment?.purchaseId;
    if (purchaseId) {
      return this.http
        .get<ApiResponse<PurchaseDetailDto>>(`${API_URL}/compras-parceladas/${purchaseId}`)
        .pipe(
          map(({ dados }) => {
            const parcels = [...dados.parcelas].sort((a, b) => a.numeroParcela - b.numeroParcela);
            const first = parcels[0];
            return {
              name: dados.nome,
              amount: dados.valorTotal,
              category: dados.categoria,
              paymentMethodId: dados.metodoPagamento.id,
              date: toIsoDate(first?.data ?? null),
              description: dados.descricao,
              realized: first?.realizado ?? true,
              installments: dados.quantidadeParcelas,
              installmentAmounts: parcels.map(({ valor }) => valor),
              invoicePeriod: first?.fatura?.dataFechamento.slice(0, 7) ?? null,
            };
          }),
        );
    }
    return this.http.get<ApiResponse<ExpenseDetailDto>>(`${API_URL}/gastos/${expense.id}`).pipe(
      map(({ dados }) => ({
        name: dados.nome,
        amount: dados.valor,
        category: dados.categoria,
        paymentMethodId: dados.metodoPagamento.id,
        date: toIsoDate(dados.data),
        description: dados.descricao,
        realized: dados.realizado,
        installments: 1,
        invoicePeriod: dados.fatura?.dataFechamento.slice(0, 7) ?? null,
      })),
    );
  }

  update(expense: Expense, changes: NewExpense): Observable<void> {
    const common = {
      nome: changes.name,
      categoria: changes.category,
      metodoPagamentoId: changes.paymentMethodId,
      data: changes.date,
      descricao: changes.description,
      faturaPeriodo: changes.invoicePeriod,
      realizado: changes.realized,
    };
    const purchaseId = expense.installment?.purchaseId;
    const request = purchaseId
      ? this.http.put(`${API_URL}/compras-parceladas/${purchaseId}`, {
          ...common,
          valorTotal: changes.amount,
          quantidadeParcelas: changes.installments,
          ...parcelAmounts(changes),
        })
      : this.http.put(`${API_URL}/gastos/${expense.id}`, { ...common, valor: changes.amount });
    return request.pipe(map(() => undefined));
  }

  listByInvoice(invoiceId: string): Observable<{ realized: Expense[]; planned: Expense[] }> {
    const params = new HttpParams().set('faturaId', invoiceId).set('size', TOTALS_PAGE_SIZE);
    const load = (kind: ExpenseKind) =>
      this.http
        .get<ApiPage<ExpenseDto>>(LIST_URLS[kind], { params })
        .pipe(map(({ dados }) => dados.map(toExpense)));
    return forkJoin({ realized: load('realized'), planned: load('planned') });
  }

  listCategories(): Observable<string[]> {
    return this.http
      .get<ApiResponse<{ categoria: string }[]>>(`${API_URL}/gastos/categorias`)
      .pipe(map(({ dados }) => dados.map(({ categoria }) => categoria)));
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
    const params = monthParams(periodKey).set('size', TOTALS_PAGE_SIZE);
    return forkJoin([
      this.http.get<ApiPage<CategoryTotalDto>>(`${API_URL}/gastos/totais/categoria`, { params }),
      this.http.get<ApiPage<PaymentTotalDto>>(`${API_URL}/gastos/totais/metodo-pagamento`, {
        params,
      }),
      this.usage.counts(),
    ]).pipe(
      map(([categories, payments, usage]) =>
        toMonthTotals(categories.dados, payments.dados, usage),
      ),
    );
  }

  getFilteredTotals(
    periodKey: string,
    filters: readonly ExpenseFilter[],
  ): Observable<FilteredTotals> {
    return this.http
      .get<ApiResponse<{ realizado: number; planejado: number }>>(`${API_URL}/gastos/totais`, {
        params: withFilters(monthParams(periodKey), filters),
      })
      .pipe(map(({ dados }) => ({ realized: dados.realizado, planned: dados.planejado })));
  }
}
