import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, from, map, mergeMap, Observable, of, switchMap, tap, throwError, toArray } from 'rxjs';
import {
  ApiPage, ApiResponse, BackendCategoryTotal, BackendExpense, BackendInvoice, BackendPayment,
  BackendPaymentTotal, BackendPurchase,
} from './backend-contracts';
import {
  AvailablePeriod, Expense, ExpenseDraft, ExpenseMetadata, ExpensePage, ExpensePeriod,
  ExpensePurchase, ExpenseQuery, ExpenseTotals, PaymentDraft, PaymentMethod, PaymentType,
} from './expense-models';

export const PAYMENT_LABELS: Readonly<Record<PaymentType, string>> = {
  CREDITO: 'Cartão de crédito', DEBITO: 'Cartão de débito', PIX: 'Pix',
  BOLETO: 'Boleto', DOC: 'DOC', TED: 'TED',
};

export function periodParameter(period: ExpensePeriod): string {
  return `${period.year}-${String(period.month + 1).padStart(2, '0')}`;
}

// A "fatura" do mês selecionado cobre do dia 21 do mês anterior ao dia 20 do mês atual.
export function invoiceInterval(period: ExpensePeriod): { inicio: string; fim: string } {
  const previous = period.month === 0
    ? { year: period.year - 1, month: 11 }
    : { year: period.year, month: period.month - 1 };
  return { inicio: `${periodParameter(previous)}-21`, fim: `${periodParameter(period)}-20` };
}

export function inputDate(date: string): string {
  return date.includes('/') ? date.split('/').reverse().join('-') : date;
}

@Injectable({ providedIn: 'root' })
export class ExpenseApi {
  private readonly http = inject(HttpClient);
  readonly offline = signal(false);

  private track<T>(request: Observable<T>): Observable<T> {
    return request.pipe(tap({
      next: () => this.offline.set(false),
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && [0, 502, 503, 504].includes(error.status)) {
          this.offline.set(true);
        }
      },
    }));
  }

  private all<T>(url: string, params = new HttpParams(), page = 0): Observable<T[]> {
    return this.track(this.http.get<ApiPage<T>>(url, {
      params: params.set('page', page).set('size', 100),
    })).pipe(switchMap((response) =>
      page + 1 >= response.paginacao.totalPaginas
        ? of(response.dados)
        : this.all<T>(url, params, page + 1).pipe(map((rest) => [...response.dados, ...rest])),
    ));
  }

  getMetadata(): Observable<ExpenseMetadata> {
    return this.track(this.http.get<ApiResponse<{ ano: number; mes: number }[]>>('/api/gastos/periodos')).pipe(
      switchMap(({ dados }) => this.getPaymentMethods().pipe(
        switchMap((methods) => {
          const requests = methods.filter((method) => method.type === 'CREDITO').map((method) =>
            this.all<Pick<BackendInvoice, 'dataFechamento'>>(`/api/faturas/cartao/${method.value}`),
          );
          return requests.length ? forkJoin(requests) : of([]);
        }),
        map((invoices) => {
          const candidates = new Set<number>();
          for (const { ano, mes } of dados) {
            const index = ano * 12 + mes - 1;
            candidates.add(index);
            candidates.add(index + 1);
          }
          for (const invoice of invoices.flat()) {
            const [year, month, day] = inputDate(invoice.dataFechamento).split('-').map(Number);
            candidates.add(year * 12 + month - 1 + (day > 20 ? 1 : 0));
          }
          return [...candidates];
        }),
      )),
      switchMap((candidates) => from(candidates).pipe(
        mergeMap((index) => this.getExpenses({
          year: Math.floor(index / 12), month: index % 12, page: 1, pageSize: 1, filter: null,
        }).pipe(map((page) => ({ index, hasExpenses: page.totalItems > 0 }))), 4),
        toArray(),
      )),
      map((availability) => {
        const today = new Date();
        const current = today.getFullYear() * 12 + today.getMonth();
        const periods: Record<number, AvailablePeriod> = {};
        let latest: number | undefined;
        for (const { index, hasExpenses } of availability) {
          if (!hasExpenses) continue;
          const ano = Math.floor(index / 12);
          const month = index % 12;
          const entry = periods[ano];
          periods[ano] = { months: [...(entry?.months ?? []), month], monthOnSelect: null };
          if (index <= current && (latest === undefined || index > latest)) latest = index;
        }
        for (const [year, value] of Object.entries(periods)) {
          const months = [...value.months].sort((a, b) => a - b);
          const preferred = +year === today.getFullYear() ? today.getMonth() : 0;
          periods[+year] = { months, monthOnSelect: months.includes(preferred) ? preferred : months[0] };
        }
        const available = availability.filter((period) => period.hasExpenses).map((period) => period.index);
        const initial = latest ?? (available.length ? Math.min(...available) : current);
        return { periods, initialPeriod: { year: Math.floor(initial / 12), month: initial % 12 } };
      }),
    );
  }

  getExpenses(query: ExpenseQuery): Observable<ExpensePage> {
    const { inicio, fim } = invoiceInterval(query);
    let params = new HttpParams().set('inicio', inicio).set('fim', fim)
      .set('page', query.page - 1).set('size', query.pageSize);
    if (query.filter) {
      params = params.set(query.filter.field === 'category' ? 'categoria' : 'metodoPagamentoId', query.filter.value);
    }
    return this.track(this.http.get<ApiPage<BackendExpense>>('/api/gastos/intervalo', { params })).pipe(
      map(({ dados, paginacao: p }) => ({
        items: dados.map((expense) => this.expense(expense, query)),
        page: p.pagina + 1, pageSize: p.tamanho, totalItems: p.totalElementos, totalPages: p.totalPaginas,
        firstItem: dados.length ? p.pagina * p.tamanho + 1 : 0,
        lastItem: dados.length ? p.pagina * p.tamanho + dados.length : 0,
      })),
    );
  }

  getTotals(period: ExpensePeriod): Observable<ExpenseTotals> {
    const { inicio, fim } = invoiceInterval(period);
    const params = new HttpParams().set('inicio', inicio).set('fim', fim);
    return forkJoin({
      payment: this.all<BackendPaymentTotal>('/api/gastos/totais/metodo-pagamento', params),
      category: this.all<BackendCategoryTotal>('/api/gastos/totais/categoria', params),
    }).pipe(map(({ payment, category }) => ({
      payment: payment.map((total) => ({
        value: total.metodoPagamentoId, name: total.nome, institution: total.instituicaoFinanceira,
        paymentMethod: PAYMENT_LABELS[total.tipo],
        planned: Math.round(total.planejado * 100), realized: Math.round(total.realizado * 100),
      })),
      category: category.map((total) => ({
        value: total.categoria, name: total.categoria,
        planned: Math.round(total.planejado * 100), realized: Math.round(total.realizado * 100),
      })),
    })));
  }

  getPaymentMethods(): Observable<PaymentMethod[]> {
    return this.all<BackendPayment>('/api/metodos-pagamento').pipe(map((methods) => methods.map((method) => this.payment(method))));
  }

  createPaymentMethod(draft: PaymentDraft): Observable<PaymentMethod> {
    return this.track(this.http.post<ApiResponse<BackendPayment>>('/api/metodos-pagamento', draft))
      .pipe(map(({ dados }) => this.payment(dados)));
  }

  getExpense(expense: Expense): Observable<Expense> {
    return this.track(this.http.get<ApiResponse<BackendExpense>>(`/api/gastos/${expense.id}`)).pipe(
      map(({ dados }) => this.expense(dados, expense)),
      switchMap((detail) => detail.purchaseId
        ? this.getPurchase(detail.purchaseId).pipe(map((purchase) => ({ ...detail, purchase })))
        : of(detail)),
    );
  }

  private getPurchase(id: string): Observable<ExpensePurchase> {
    return this.track(this.http.get<ApiResponse<BackendPurchase>>(`/api/compras-parceladas/${id}`)).pipe(
      map(({ dados }) => ({
        id: dados.id, amountInCents: Math.round(dados.valorTotal * 100), quantity: dados.quantidadeParcelas,
        installments: dados.parcelas.map((item) => {
          const date = inputDate(item.data);
          const [year, month] = item.fatura.dataFechamento.split('-').map(Number);
          return {
            id: item.id, number: item.numeroParcela, year, month: month - 1, date,
            closingDate: item.fatura.dataFechamento, amountInCents: Math.round(item.valor * 100), realized: item.realizado,
          };
        }),
      })),
    );
  }

  saveExpense(draft: ExpenseDraft, existing?: Expense): Observable<void> {
    const { parcelado, quantidadeParcelas, valor, valoresParcelas, ...body } = draft;
    const data = body.data ? body.data.split('-').reverse().join('/') : null;
    const purchase = parcelado || !!existing?.installment;
    const { realizado, ...purchaseBody } = body;
    const payload = purchase
      ? {
        ...purchaseBody, data, valorTotal: valor, quantidadeParcelas,
        ...(valoresParcelas ? { valoresParcelas } : {}),
        ...(existing ? { realizado } : {}),
      }
      : { ...body, data, valor };
    const url = purchase ? '/api/compras-parceladas' : '/api/gastos';
    const id = purchase ? existing?.purchaseId : existing?.id;
    if (existing?.installment && !id) {
      return throwError(() => new Error('Compra parcelada não identificada. Reabra os detalhes antes de editar.'));
    }
    return this.track(existing
      ? this.http.put(`${url}/${id}`, payload)
      : this.http.post(url, payload)).pipe(map(() => undefined));
  }

  deleteExpense(expense: Expense): Observable<void> {
    return (expense.installment && !expense.purchaseId ? this.getExpense(expense) : of(expense)).pipe(
      switchMap((target) => {
        if (target.installment && !target.purchaseId) throw new Error('Compra parcelada não identificada.');
        return this.track(this.http.delete<void>(target.installment
          ? `/api/compras-parceladas/${target.purchaseId}` : `/api/gastos/${target.id}`));
      }),
    );
  }

  private payment(method: BackendPayment): PaymentMethod {
    return {
      value: method.id, name: method.nome, institution: method.instituicaoFinanceira,
      paymentMethod: PAYMENT_LABELS[method.tipo], type: method.tipo,
      closingDay: method.diaFechamento, dueDay: method.diaVencimento,
    };
  }

  private expense(value: BackendExpense, period: ExpensePeriod): Expense {
    const date = value.data ? inputDate(value.data).split('-').map(Number) : undefined;
    return {
      id: value.id, year: date?.[0] ?? period.year, month: (date?.[1] ?? period.month + 1) - 1,
      day: date?.[2] ?? null, name: value.nome, amountInCents: Math.round(value.valor * 100),
      description: value.descricao ?? '', category: value.categoria, realized: value.realizado,
      institution: value.metodoPagamento.instituicaoFinanceira,
      paymentMethod: PAYMENT_LABELS[value.metodoPagamento.tipo],
      paymentName: value.metodoPagamento.nome ?? PAYMENT_LABELS[value.metodoPagamento.tipo],
      paymentId: value.metodoPagamento.id, closingDay: value.metodoPagamento.diaFechamento ?? undefined,
      invoiceId: value.fatura?.id, invoicePeriod: value.fatura?.dataFechamento.slice(0, 7),
      invoiceClosingDay: value.fatura ? Number(value.fatura.dataFechamento.slice(8, 10)) : undefined,
      purchaseId: value.parcela?.compraParceladaId,
      installment: value.parcela ? {
        number: value.parcela.numero,
        quantity: value.parcela.quantidade,
      } : undefined,
    };
  }
}
