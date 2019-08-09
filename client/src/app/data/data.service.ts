import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of } from 'rxjs';

@Injectable()
export class DataService {

  ELEMENT_DATA: ChannelMapping[] = [
    {
      team: { id: '1', name: 'Team Name 1' },
      teamsChannel: { id: '1.1', name: 'channel 1' },
      workspace: { id: 'workspace 1', name: 'Workspace 1' },
      slackChannel: { id: '1', name: 'channel 1' },
      mappingOwner: {id: '5a85aa45-9606-4698-b599-44697e2cbfcb', name: 'Andrew Sturrock'}
    },
    {
      team: { id: '2', name: 'Team Name 2' },
      teamsChannel: { id: '2.1', name: 'channel 1' },
      workspace: { id: 'workspace_2', name: 'Workspace 2' },
      slackChannel: { id: '1', name: 'channel 1' },
      mappingOwner: {id: '5a85aa45-9606-4698-b599-44697e2cbfcc', name: 'Dave Richards'}
    },
  ];

  getTeams(userId) {
    console.error("//TODO - get teams from server for user id " + userId)
    return [{ id: '1', name: 'Team Name 1' }]
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

  constructor() {
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
}
