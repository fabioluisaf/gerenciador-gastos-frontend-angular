import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL, ApiResponse } from '../core/api';

interface UsageDto {
  metodoPagamentoId: string;
  quantidadeGastos: number;
}

export type PaymentUsage = ReadonlyMap<string, number>;

@Injectable({ providedIn: 'root' })
export class PaymentUsageApi {
  private readonly http = inject(HttpClient);

  counts(): Observable<PaymentUsage> {
    return this.http
      .get<ApiResponse<UsageDto[]>>(`${API_URL}/metodos-pagamento/uso`)
      .pipe(
        map(
          ({ dados }) =>
            new Map(
              dados.map(({ metodoPagamentoId, quantidadeGastos }) => [
                metodoPagamentoId,
                quantidadeGastos,
              ]),
            ),
        ),
      );
  }
}
