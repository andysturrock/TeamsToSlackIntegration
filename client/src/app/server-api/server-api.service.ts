import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as util from 'util';
import { ChannelMapping } from '../channelMapping';

const apiBaseUrl = 'http://localhost:3000/api'

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
    // TODO - protect the API
    let params = new HttpParams().set('token', 'TODO')
    httpOptions.params = params;
    let response = await this.http.post(apiBaseUrl, JSON.stringify(data), httpOptions).toPromise();
  }

  async getMappingsAsync(): Promise<ChannelMapping[]> {
    try {
      // TODO - protect the API
      let params = new HttpParams().set('token', 'TODO')
      httpOptions.params = params;
      return await this.http.get<ChannelMapping[]>(apiBaseUrl, httpOptions).toPromise();
    }
    catch (error) {
      console.error("getMappingsAsync() error: " + util.inspect(error))
    }
  }

  async deleteMappingAsync(data): Promise<void> {
    try {
      // the http.delete method doesn't allow a body, so use this instead...
      await this.http.request('delete', apiBaseUrl,
        {
          body: JSON.stringify(data),
          headers: httpOptions.headers,
          // TODO - protect the API
          params: new HttpParams().set('token', 'TODO')
        }).toPromise();
    }
    catch (error) {
      console.error("deleteMappingAsync() error: " + util.inspect(error))
    }
  }
}
