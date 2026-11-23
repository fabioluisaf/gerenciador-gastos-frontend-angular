import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL, ApiPage, ApiResponse } from '../core/api';
import { GroupApplication, NewPlannedGroup, PlannedGroup, PlannedGroupItem } from './planned-group';

interface ItemDto {
  nome: string;
  valor: number;
  categoria: string;
  descricao: string | null;
}

interface PlannedGroupDto {
  id: string;
  nome: string;
  valorTotal: number;
  itens: ItemDto[];
}

const URL = `${API_URL}/grupos-planejados`;
const PAGE_SIZE = 200;

function toItemDto({ name, amount, category, description }: PlannedGroupItem): ItemDto {
  return { nome: name, valor: amount, categoria: category, descricao: description };
}

function toGroup(dto: PlannedGroupDto): PlannedGroup {
  return {
    id: dto.id,
    name: dto.nome,
    total: dto.valorTotal,
    items: dto.itens.map(({ nome, valor, categoria, descricao }) => ({
      name: nome,
      amount: valor,
      category: categoria,
      description: descricao,
    })),
  };
}

function toBody({ name, items }: NewPlannedGroup) {
  return { nome: name, itens: items.map(toItemDto) };
}

@Injectable({ providedIn: 'root' })
export class PlannedGroupsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<PlannedGroup[]> {
    return this.http
      .get<ApiPage<PlannedGroupDto>>(URL, { params: new HttpParams().set('size', PAGE_SIZE) })
      .pipe(map(({ dados }) => dados.map(toGroup)));
  }

  create(group: NewPlannedGroup): Observable<PlannedGroup> {
    return this.http
      .post<ApiResponse<PlannedGroupDto>>(URL, toBody(group))
      .pipe(map(({ dados }) => toGroup(dados)));
  }

  update(id: string, group: NewPlannedGroup): Observable<PlannedGroup> {
    return this.http
      .put<ApiResponse<PlannedGroupDto>>(`${URL}/${id}`, toBody(group))
      .pipe(map(({ dados }) => toGroup(dados)));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${URL}/${id}`);
  }

  apply(id: string, application: GroupApplication): Observable<void> {
    return this.http
      .post<unknown>(`${URL}/${id}/aplicacoes`, {
        metodoPagamentoId: application.paymentMethodId,
        data: application.date,
        faturaPeriodo: application.invoicePeriod,
        itens: application.items.map(toItemDto),
      })
      .pipe(map(() => undefined));
  }
}
