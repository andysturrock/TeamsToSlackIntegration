import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GraphService } from '../graph/graph.service';
import { SlackWebApiService } from '../slack-web-api/slack-web-api.service';
import * as util from 'util';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

// This class doesn't do much.  It's just a facade over the various API services.
@Injectable()
export class DataService {
  constructor(
    private graphService: GraphService,
    private slackWebApiService: SlackWebApiService,) {
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

  async getUserAsync() {
    return await this.graphService.getUserAsync()
  }

  async getTeamsAsync(userId: string) {
    return await this.graphService.getTeamsAsync(userId);
  }

  async getTeamsChannelsAsync(teamId) {
    return await this.graphService.getTeamsChannelsAsync(teamId);
  }

  async getWorkspaceAsync(botToken) {
    return await this.slackWebApiService.getWorkspaceAsync(botToken);
  }

  async getSlackChannels(botToken) {
    return await this.slackWebApiService.getSlackChannelsAsync(botToken);
  }

  getData(): Observable<ChannelMapping[]> {
    // TODO get data from server
    return of<ChannelMapping[]>(this.ELEMENT_DATA);
  }

  addMapping(data) {
    // TODO add data to server
    this.ELEMENT_DATA.push(data);
  }

  deleteMapping(index) {
    // TODO delete data from server
    this.ELEMENT_DATA = [...this.ELEMENT_DATA.slice(0, index), ...this.ELEMENT_DATA.slice(index + 1)];
  }

  dataLength() {
    return this.ELEMENT_DATA.length;
  }
}
