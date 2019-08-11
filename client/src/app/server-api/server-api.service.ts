import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as util from 'util';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
  params: null
};

@Injectable({
  providedIn: 'root'
})
export class ServerApiService {
  constructor(private http: HttpClient) { }

  async postMappingAsync(data: string) {
    try {
      console.error("posting: " + util.inspect(data))
      // TODO - protect the API
      let params = new HttpParams().set('token', 'TODO')
      httpOptions.params = params;
      let response = await this.http.post('http://localhost:3000/api', JSON.stringify(data), httpOptions).toPromise();
      console.error("postMappingAsync() response = " + util.inspect(response))
      return;
    }
    catch (error) {
      console.error("postMappingAsync() error: " + util.inspect(error))
    }
  }
}
