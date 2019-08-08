import { Component, EventEmitter, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material';
import { DataService } from '../data/data.service';
import { AuthService } from '../auth/auth.service';
import * as util from 'util';

@Component({
  selector: 'app-mapping-dialog',
  templateUrl: './mapping-dialog.component.html',
  styleUrls: ['./mapping-dialog.component.css']
})
export class MappingDialogComponent {
  channelMapping = {
    position: 0,
    teamId: '',
    teamName: '',
    teamsChannelId: '',
    teamsChannelName: '',
    workspaceId: '',
    workspaceName: '',
    slackChannelId: '',
    slackChannelName: '',
    mappingOwnerId: '',
    mappingOwnerName: ''
  };
  public event: EventEmitter<any> = new EventEmitter();

  teams = null;
  selectedTeam = null;
  teamsChannels = null;
  slackToken = null;
  workspaces = null;
  selectedWorkspace = null;
  slackChannels = null;

  constructor(
    public dialogRef: MatDialogRef<MappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dataService: DataService,
    private authService: AuthService
  ) {
    const user = this.authService.getUser();
    this.channelMapping.mappingOwnerName = user.displayName;
    this.channelMapping.mappingOwnerId = user.id;

    this.teams = this.dataService.getTeams(this.channelMapping.mappingOwnerId);

    this.workspaces = this.dataService.getWorkspaces("botId 1");
  }

  onTeamSelection(e): void {
    this.selectedTeam = e.value;
    this.teamsChannels = this.dataService.getTeamsChannels(this.selectedTeam.teamId);
  }

  onWorkspaceSelection(e): void {
    this.selectedWorkspace = e.value;
    this.slackChannels = this.dataService.getSlackChannels(this.selectedWorkspace.workspaceId);
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.channelMapping.position = this.dataService.dataLength();
    this.event.emit({ data: this.channelMapping });
    this.dialogRef.close();
  }
}
