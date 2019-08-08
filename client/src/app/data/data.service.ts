import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of } from 'rxjs';

@Injectable()
export class DataService {

  ELEMENT_DATA: ChannelMapping[] = [
    {
      position: 0, teamId: '1', teamName: 'Team Name 1', teamsChannelId: '1.1', teamsChannelName: 'channel 1',
      workspaceId: 'workspace 1', workspaceName: 'Workspace 1', slackChannelId: '1', slackChannelName: 'channel 1',
      mappingOwnerId: '5a85aa45-9606-4698-b599-44697e2cbfcb', mappingOwnerName: 'Andrew Sturrock'
    },
    {
      position: 1, teamId: '1', teamName: 'Team Name 1', teamsChannelId: '1.2', teamsChannelName: 'channel 2',
      workspaceId: 'workspace 1', workspaceName: 'Workspace 1', slackChannelId: '2', slackChannelName: 'channel 2',
      mappingOwnerId: '5a85aa45-9606-4698-b599-44697e2cbfcc', mappingOwnerName: 'Dave Richards'
    },
  ];

  getTeams(userId) {
    console.error("//TODO - get teams from server for user id " + userId)
    return [{teamId: '1', teamName: 'Team Name 1'}]
  }
  
  getTeamsChannels(teamId) {
    console.error("//TODO - get teams channels from server for team id: " + teamId)
    return [{teamsChannelId: '1.1', teamsChannelName: 'channel 1'}, {teamsChannelId: '1.2', teamsChannelName: 'channel 2'}];
  }

  getWorkspaces(botId) {
    console.error("//TODO - get workspaces from server for bot id " + botId)
    return [{workspaceId: 'workspace 1', workspaceName: 'Workspace 1'}];
  }
  
  getSlackChannels(workspaceId) {
    console.error("//TODO - get slackworkspaes from server for workspace id " + workspaceId)
    return [{slackChannelId: '1', slackChannelName: 'channel 1'}, {slackChannelId: '2', slackChannelName: 'channel 2'}];
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
