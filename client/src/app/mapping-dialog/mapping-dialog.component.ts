import { Component, EventEmitter, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DataService } from '../data/data.service';
import * as util from 'util';
import { ChannelMapping } from '../channelMapping';
import { ChannelMappingDataSource } from '../dashboard/dashboard.component';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-mapping-dialog',
  templateUrl: './mapping-dialog.component.html',
  styleUrls: ['./mapping-dialog.component.css']
})
export class MappingDialogComponent {
  channelMapping: ChannelMapping = new ChannelMapping();
  event: EventEmitter<any> = new EventEmitter();

  teams = null;
  teamsChannels = null;
  slackChannels = null;

  constructor(
    public dialogRef: MatDialogRef<MappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dataService: DataService
  ) { }

  ngOnInit() {
    this.ngOnInitAsync().then();
  }

  async ngOnInitAsync() {
    const user = await this.dataService.getUserAsync();
    this.channelMapping.mappingOwner = { name: user.displayName, id: user.id, token: user.ApiToken };
    this.teams = await this.dataService.getTeamsAsync(this.channelMapping.mappingOwner.id);
  }

  async onTeamSelectionAsync(e): Promise<void> {
    this.teamsChannels = await this.dataService.getTeamsChannelsAsync(e.value.id);
  }

  async onWorkspaceSearch() {
    this.channelMapping.workspace = await this.dataService.getWorkspaceAsync(this.channelMapping.slackBotToken);
    this.slackChannels = await this.dataService.getSlackChannels(this.channelMapping.slackBotToken)
  }

  enableSubmit() {
    return this.channelMapping.team.id &&
      this.channelMapping.teamsChannel.id &&
      this.channelMapping.workspace.id &&
      this.channelMapping.slackChannel.id &&
      this.channelMapping.mappingOwner.id;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.event.emit({ data: this.channelMapping });
    this.dialogRef.close();
  }
}