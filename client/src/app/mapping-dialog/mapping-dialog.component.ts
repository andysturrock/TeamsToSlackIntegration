import { Component, EventEmitter, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DataService } from '../data/data.service';
import { GraphService } from '../graph/graph.service';
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
  private selectedTeam = null;
  private teamsChannels = null;
  private slackToken = null;
  private workspaces = null;
  private selectedWorkspace = null;
  private slackChannels = null;

  constructor(
    public dialogRef: MatDialogRef<MappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dataService: DataService,
    private graphService: GraphService
  ) { }

  ngOnInit() {
    console.error("ngOnInit")
    this.ngOnInitAsync().then();
    console.error("ngOnInit end")
  }

  async ngOnInitAsync() {
    console.error("ngOnInitAsync")
    const user = await this.graphService.getUserAsync();
    this.channelMapping.mappingOwner = {name: user.displayName, id: user.id};

    this.teams = await this.dataService.getTeamsAsync(this.channelMapping.mappingOwner.id);

    this.workspaces = this.dataService.getWorkspaces("botId 1");

    console.error("ngOnInitAsync end")
  }

  private async onTeamSelectionAsync(e): Promise<void> {
    this.selectedTeam = e.value;
    this.teamsChannels = await this.dataService.getTeamsChannelsAsync(this.selectedTeam.id);
  }

  private async onWorkspaceSelectionAsync(e): Promise<void> {
    this.selectedWorkspace = e.value;
    this.slackChannels = await this.dataService.getSlackChannels(this.selectedWorkspace.id);
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
