import { Injectable } from '@angular/core';
import { ChannelMapping } from '../channelMapping';
import { Observable, of, from } from 'rxjs';
import { GraphService } from '../graph/graph.service';
import { SlackWebApiService } from '../slack-web-api/slack-web-api.service';
import { ServerApiService } from '../server-api/server-api.service';
import * as util from 'util';

// This class doesn't do much.  It's just a facade over the various API services.
@Injectable()
export class DataService {
  constructor(
    private graphService: GraphService,
    private slackWebApiService: SlackWebApiService,
    private serverApiService: ServerApiService,
  ) {
  }

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

  getMappings(): Observable<ChannelMapping[]> {
    return from(this.serverApiService.getMappingsAsync().then());
  }

  async addMappingAsync(data) {
    await this.serverApiService.postMappingAsync(data)
  }

  async deleteMappingAsync(data) {
    await this.serverApiService.deleteMappingAsync(data)
  }
}
