import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of } from 'rxjs';

@Injectable()
export class DataService {

  ELEMENT_DATA: ChannelMapping[] = [
    {
      position: 0, teamId: '1', teamName: 'Team Name 1', teamsChannelId: '1.1', teamsChannelName: 'channel 1',
      workspaceId: 'workspace 1', workspaceName: 'Workspace 1', slackChannelId: '1', slackChannelName: 'channel 1'
    },
    {
      position: 0, teamId: '1', teamName: 'Team Name 1', teamsChannelId: '1.2', teamsChannelName: 'channel 2',
      workspaceId: 'workspace 1', workspaceName: 'Workspace 1', slackChannelId: '2', slackChannelName: 'channel 2'
    },
  ];
  categories = [
    { value: 'Web-Development', viewValue: 'Web Development' },
    { value: 'Android-Development', viewValue: 'Android Development' },
    { value: 'IOS-Development', viewValue: 'IOS Development' }
  ];

  // teamId: string;
  // teamName: string;
  // teamsChannelId: string;
  // teamsChannelName: string;
  // workspaceId: string;
  // workspaceName: string;
  // slackChannelId: string;
  // slackChannelName: string;
  // position: number;

  constructor() {
  }

  getData(): Observable<ChannelMapping[]> {
    return of<ChannelMapping[]>(this.ELEMENT_DATA);
  }

  getCategories() {
    return this.categories;
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
