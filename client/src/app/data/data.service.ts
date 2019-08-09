import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class DataService {

  constructor(
    private http: HttpClient) {
  }

  private teamsUrl = 'api/teams'

  ELEMENT_DATA: ChannelMapping[] = [
    {
      team: { id: '1', name: 'Team Name 1' },
      teamsChannel: { id: '1.1', name: 'channel 1' },
      workspace: { id: 'workspace 1', name: 'Workspace 1' },
      slackChannel: { id: '1', name: 'channel 1' },
      mappingOwner: { id: '5a85aa45-9606-4698-b599-44697e2cbfcb', name: 'Andrew Sturrock' }
    },
    {
      team: { id: '2', name: 'Team Name 2' },
      teamsChannel: { id: '2.1', name: 'channel 1' },
      workspace: { id: 'workspace_2', name: 'Workspace 2' },
      slackChannel: { id: '1', name: 'channel 1' },
      mappingOwner: { id: '5a85aa45-9606-4698-b599-44697e2cbfcc', name: 'Dave Richards' }
    },
  ];

  async getTeamsAsync(userId): Promise<{id: null, name: null}[]> {
    try {
      const url = `${this.teamsUrl}/${userId}`;
      let response = await this.http.get<{id: null, name: null}[]>(url).toPromise();
      return response;
    }
    catch(error) {
      return await this.handleErrorAsync<any>(error, `getTeamsAsync id=${userId}`);
    }
  }

  getTeamsChannels(teamId) {
    console.error("//TODO - get teams channels from server for team id: " + teamId)
    return [{ id: '1.1', name: 'channel 1' }, { id: '1.2', name: 'channel 2' }];
  }

  getWorkspaces(botId) {
    console.error("//TODO - get workspaces from server for bot id " + botId)
    return [{ id: 'workspace 1', name: 'Workspace 1' }];
  }

  getSlackChannels(workspaceId) {
    console.error("//TODO - get slackworkspaes from server for workspace id " + workspaceId)
    return [{ id: '1', name: 'channel 1' }, { id: '2', name: 'channel 2' }];
  }

  getData(): Observable<ChannelMapping[]> {
    return of<ChannelMapping[]>(this.ELEMENT_DATA);
  }

  addMapping(data) {
    this.ELEMENT_DATA.push(data);
  }

  deleteMapping(index) {
    this.ELEMENT_DATA = [...this.ELEMENT_DATA.slice(0, index), ...this.ELEMENT_DATA.slice(index + 1)];
  }

  dataLength() {
    return this.ELEMENT_DATA.length;
  }

  private async handleErrorAsync<T> (error: any, operation = 'operation', result?: T) {
      
    // TODO: send the error to remote logging infrastructure
    console.error(error); // log to console instead
    
    // Let the app keep running by returning an empty result.
    return (result as T);
  }
}
