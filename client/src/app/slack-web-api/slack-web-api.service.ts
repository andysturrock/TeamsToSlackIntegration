import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as util from 'util';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
  params: null
};

@Injectable()
export class SlackWebApiService {

  private webClient;

  constructor(private http: HttpClient) {
  }

  async getWorkspaceAsync(botToken: string) {
    try {
      let params = new HttpParams().set("token", botToken)
      httpOptions.params = params;
      let response = await this.http.get<any>('https://slack.com/api/team.info', httpOptions).toPromise();
      console.error("getWorkspace() returning: " + util.inspect(response))
      console.error("getWorkspace() response.team.id: " + util.inspect(response.team.id))
      return {id: response.team.id, name: response.team.name};
    }
    catch (error) {
      console.error("getWorkspace() error: " + util.inspect(error))
    }
  }
}
