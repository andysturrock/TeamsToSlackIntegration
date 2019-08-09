import { Component, EventEmitter, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DataService } from '../data/data.service';
import { AuthService } from '../auth/auth.service';
import * as util from 'util';
import { ChannelMapping } from '../channelMapping';
import { ChannelMappingDataSource } from '../dashboard/dashboard.component';

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
    private authService: AuthService
  ) { }

  ngOnInit() {
    console.error("MappingDialogComponent.ctor() data = " + util.inspect(this.data))

    const user = this.authService.getUser();
    this.channelMapping.mappingOwner = {name: user.displayName, id: user.id};

    this.teams = this.dataService.getTeams(this.channelMapping.mappingOwner.id);

    this.workspaces = this.dataService.getWorkspaces("botId 1");
  }

  private onTeamSelection(e): void {
    this.selectedTeam = e.value;
    this.teamsChannels = this.dataService.getTeamsChannels(this.selectedTeam.id);
  }

  private onWorkspaceSelection(e): void {
    this.selectedWorkspace = e.value;
    this.slackChannels = this.dataService.getSlackChannels(this.selectedWorkspace.id);
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
