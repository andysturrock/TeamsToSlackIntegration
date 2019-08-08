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

  constructor(
    public dialogRef: MatDialogRef<MappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dataService: DataService,
    private authService: AuthService
  ) {
    this.channelMapping.mappingOwnerName = this.authService.user.displayName;
  }

  onTeamSelection(e): void {
    console.error("onSelection(e) = " + util.inspect(e.value))
    this.selectedTeam = e.value;
  }

  onWorkspaceSelection(e): void {
    console.error("onSelection(e) = " + util.inspect(e.value))
    this.selectedWorkspace = e.value;
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    this.channelMapping.position = this.dataService.dataLength();
    this.event.emit({ data: this.channelMapping });
    this.dialogRef.close();
  }

  teams = this.dataService.getTeams();
  selectedTeam = null;
  teamsChannels = this.dataService.getTeamsChannels();
  slackToken = null;
  workspaces = this.dataService.getWorkspaces();
  selectedWorkspace = null;
  slackChannels = this.dataService.getSlackChannels();

}
