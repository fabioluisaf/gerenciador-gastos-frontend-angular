import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL, ApiPage } from '../core/api';
import { Invoice } from './invoice';

interface InvoiceDto {
  id: string;
  dataFechamento: string;
  dataVencimento: string;
  valorTotal: number;
}

const PAGE_SIZE = 200;

@Injectable({ providedIn: 'root' })
export class InvoicesApi {
  private readonly http = inject(HttpClient);

  list(paymentMethodId: string): Observable<Invoice[]> {
    return this.http
      .get<ApiPage<InvoiceDto>>(`${API_URL}/faturas/cartao/${paymentMethodId}`, {
        params: new HttpParams().set('size', PAGE_SIZE),
      })
      .pipe(
        map(({ dados }) =>
          dados.map((dto) => ({
            id: dto.id,
            closingDate: dto.dataFechamento,
            dueDate: dto.dataVencimento,
            total: dto.valorTotal,
          })),
        ),
      );
  }
}
