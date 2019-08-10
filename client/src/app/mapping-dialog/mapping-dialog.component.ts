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
  private channelMapping: ChannelMapping = new ChannelMapping();
  event: EventEmitter<any> = new EventEmitter();

  private teams = null;
  private teamsChannels = null;
  private slackChannels = null;
  private slackBotToken = null;

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
    this.channelMapping.mappingOwner = { name: user.displayName, id: user.id };
    this.teams = await this.dataService.getTeamsAsync(this.channelMapping.mappingOwner.id);
  }

  private async onTeamSelectionAsync(e): Promise<void> {
    this.teamsChannels = await this.dataService.getTeamsChannelsAsync(e.value.id);
  }

  private async onWorkspaceSearch() {
    this.channelMapping.workspace = await this.dataService.getWorkspaceAsync(this.slackBotToken);
    this.slackChannels = await this.dataService.getSlackChannels(this.slackBotToken)
  }

  private enableSubmit() {
    return this.channelMapping.team.id &&
      this.channelMapping.teamsChannel.id &&
      this.channelMapping.workspace.id &&
      this.channelMapping.slackChannel.id &&
      this.channelMapping.mappingOwner.id;
  }

  private onNoClick(): void {
    this.dialogRef.close();
  }

  private onSubmit(): void {
    // this.channelMapping.position = this.dataService.dataLength();
    this.event.emit({ data: this.channelMapping });
    this.dialogRef.close();
  }
}
