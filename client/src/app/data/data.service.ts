import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of } from 'rxjs';

@Injectable()
export class DataService {

  ELEMENT_DATA: ChannelMapping[] = [
    {
      position: 0, teamId: '1', teamName: 'Team Name 1', teamsChannelId: '1.1', teamsChannelName: 'channel 1',
      workspaceId: 'workspace 1', workspaceName: 'Workspace 1', slackChannelId: '1', slackChannelName: 'channel 1',
      mappingOwnerId: '1', mappingOwnerName: 'andrew.sturrock@uk.bp.com'
    },
    {
      position: 1, teamId: '1', teamName: 'Team Name 1', teamsChannelId: '1.2', teamsChannelName: 'channel 2',
      workspaceId: 'workspace 1', workspaceName: 'Workspace 1', slackChannelId: '2', slackChannelName: 'channel 2',
      mappingOwnerId: '1', mappingOwnerName: 'andrew.sturrock@uk.bp.com'
    },
  ];
  private categories = [
    { value: 'Web-Development', viewValue: 'Web Development' },
    { value: 'Android-Development', viewValue: 'Android Development' },
    { value: 'IOS-Development', viewValue: 'IOS Development' }
  ];

  getCategories() {
    return this.categories;
  }

  getTeams() {
    return [{teamId: '1', teamName: 'Team Name 1'}]
  }
  
  getTeamsChannels() {
    return [{teamsChannelId: '1.1', teamsChannelName: 'channel 1'}, {teamsChannelId: '1.2', teamsChannelName: 'channel 2'}];
  }

  getWorkspaces() {
    return [{workspaceId: 'workspace 1', workspaceName: 'Workspace 1'}];
  }
  
  getSlackChannels() {
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
