import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api';

@Injectable({ providedIn: 'root' })
export class BackupApi {
  private readonly http = inject(HttpClient);

  download(): Observable<Blob> {
    return this.http.get(`${API_URL}/backup`, { responseType: 'blob' });
  }
}
