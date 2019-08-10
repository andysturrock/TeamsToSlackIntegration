import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import * as util from 'util';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/x-www-form-urlencoded' }),
  params: null
};

@Injectable()
export class SlackWebApiService {

  constructor(private http: HttpClient) {
  }

  async getWorkspaceAsync(botToken: string) {
    try {
      let params = new HttpParams().set('token', botToken)
      httpOptions.params = params;
      let response = await this.http.get<any>('https://slack.com/api/team.info', httpOptions).toPromise();
      return { id: response.team.id, name: response.team.name };
    }
    catch (error) {
      console.error("getWorkspaceAsync() error: " + util.inspect(error))
    }
  }

  async getSlackChannelsAsync(botToken: string) {
    try {
      // TODO need to paginate if more than 1000 channels in a workspace.  Unlikely but could happen.
      // It's annoying we can't use the Slack sdk in Angular (it needs the "process" module which doesn't work in the browser)
      // as that takes care of pagination for you.
      let params = new HttpParams().set('token', botToken).set('exclude_archived', 'true').set('limit', '1000')
      httpOptions.params = params;
      let response = await this.http.get<any>('https://slack.com/api/conversations.list', httpOptions).toPromise();
      const channels = [];
      for(let channel of response.channels) {
        if(channel.is_member) {
          channels.push({id: channel.id, name: channel.name});
        }
      }
      return channels;
    }
    catch (error) {
      console.error("getSlackChannelsAsync() error: " + util.inspect(error))
    }
  }
}
