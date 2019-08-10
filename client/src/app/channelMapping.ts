export class ChannelMapping {
  team: { id: string, name: string };
  teamsChannel: { id: string, name: string };
  workspace: { id: string, name: string };
  slackChannel: {id: string, name: string};
  mappingOwner: {id: string, name: string, token: string};

  constructor() {
    this.team = {id: null, name: null};
    this.teamsChannel = {id: null, name: null};
    this.workspace = {id: null, name: null};
    this.slackChannel = {id: null, name: null};
    this.mappingOwner = {id: null, name: null, token: null};
  }
}
