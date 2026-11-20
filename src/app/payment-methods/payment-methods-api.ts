import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { API_URL, ApiPage } from '../core/api';
import { byPaymentTypeThenUsage, PaymentType } from '../expenses/expense';
import { InstitutionDto, toInstitution } from '../expenses/institution-dto';
import { PaymentMethod } from './payment-method';
import { PaymentUsage, PaymentUsageApi } from './payment-usage-api';

interface PaymentMethodDto {
  id: string;
  tipo: PaymentType;
  instituicaoFinanceira: InstitutionDto;
  nome: string;
  diaFechamento: number | null;
  diaVencimento: number | null;
}

const PAGE_SIZE = 200;

function toPaymentMethod(dto: PaymentMethodDto, usage: PaymentUsage): PaymentMethod {
  return {
    id: dto.id,
    name: dto.nome,
    paymentType: dto.tipo,
    institution: toInstitution(dto.instituicaoFinanceira),
    closingDay: dto.diaFechamento,
    dueDay: dto.diaVencimento,
    usageCount: usage.get(dto.id) ?? 0,
  };
}

@Injectable({ providedIn: 'root' })
export class PaymentMethodsApi {
  private readonly http = inject(HttpClient);
  private readonly usage = inject(PaymentUsageApi);

  list(): Observable<PaymentMethod[]> {
    return forkJoin([
      this.http.get<ApiPage<PaymentMethodDto>>(`${API_URL}/metodos-pagamento`, {
        params: new HttpParams().set('size', PAGE_SIZE),
      }),
      this.usage.counts(),
    ]).pipe(
      map(([{ dados }, usage]) => {
        const byUsage = byPaymentTypeThenUsage(usage);
        return dados
          .map((dto) => toPaymentMethod(dto, usage))
          .sort((a, b) => byUsage(a, b) || a.name.localeCompare(b.name, 'pt-BR'));
      }),
    );
  }

  delete(method: PaymentMethod): Observable<void> {
    return this.http.delete<void>(`${API_URL}/metodos-pagamento/${method.id}`);
  }
}
