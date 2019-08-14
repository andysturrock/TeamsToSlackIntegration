import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as util from 'util';
import { ChannelMapping } from '../channelMapping';

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
    console.error("posting: " + util.inspect(data))
    // TODO - protect the API
    let params = new HttpParams().set('token', 'TODO')
    httpOptions.params = params;
    let response = await this.http.post('http://localhost:3000/api', JSON.stringify(data), httpOptions).toPromise();
    console.error("postMappingAsync() response = " + util.inspect(response))
  }

  async getMappingsAsync(): Promise<ChannelMapping[]> {
    try {
      // TODO - protect the API
      let params = new HttpParams().set('token', 'TODO')
      httpOptions.params = params;
      let response = await this.http.get<any>('http://localhost:3000/api', httpOptions).toPromise();
      // console.error("getMappingsAsync() response = " + util.inspect(response))
      const mappings: ChannelMapping[] = []
      for (let mappingString of response) {
        // console.error("mappingString = " + util.inspect(JSON.parse(mappingString)))
        const mapping = new ChannelMapping(mappingString)
        // console.error("mapping = " + util.inspect(mapping))
        mappings.push(mapping)
      }
      return mappings;
    }
    catch (error) {
      console.error("getMappingsAsync() error: " + util.inspect(error))
    }
  }

  async deleteMappingAsync(data): Promise<void> {
    try {
      // the http.delete method doesn't allow a body, so use this instead...
      await this.http.request('delete', 'http://localhost:3000/api',
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
