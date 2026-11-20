import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { API_URL, ApiPage } from '../core/api';
import { Institution } from '../expenses/expense';
import { InstitutionDto, toInstitution } from '../expenses/institution-dto';

export const MAX_ICON_BYTES = 1024 * 1024;

export interface NewInstitution {
  name: string;
  color: string | null;
  icon: File | null;
}

@Injectable({ providedIn: 'root' })
export class InstitutionsApi {
  private readonly http = inject(HttpClient);

  list(): Observable<Institution[]> {
    return this.http
      .get<ApiPage<InstitutionDto>>(`${API_URL}/instituicoes-financeiras`)
      .pipe(map(({ dados }) => dados.map(toInstitution)));
  }

  create(institution: NewInstitution): Observable<void> {
    const body = new FormData();
    body.append('nome', institution.name);
    if (institution.color) {
      body.append('cor', institution.color);
    }
    if (institution.icon) {
      body.append('icone', institution.icon);
    }
    return this.http.post(`${API_URL}/instituicoes-financeiras`, body).pipe(map(() => undefined));
  }
}
