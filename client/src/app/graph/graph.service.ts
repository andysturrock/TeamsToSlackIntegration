import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Client } from '@microsoft/microsoft-graph-client';
import * as util from 'util';

import { OAuthSettings } from '../../oauth';
import { User } from '../user';

@Injectable({
  providedIn: 'root'
})
export class GraphService {
  private authenticated: boolean;
  private user: User;
  private graphClient: Client;
  private accessToken: string;

  constructor(
    private msalService: MsalService) {
    this.authenticated = this.msalService.getUser() != null;
    this.initGraphAsync().then();
  }

  private async initGraphAsync() {
    this.graphClient = Client.init({
      // Initialize the Graph client with an auth
      // provider that requests the token from the
      // auth service
      authProvider: async (done) => {
        let token = await this.getAccessTokenAsync()
          .catch((reason) => {
            done(reason, null);
          })

        if (token) {
          this.accessToken = token;
          done(null, token);
        } else {
          done("Could not get an access token", null);
        }
      }
    });

    await this.setUser();
  }

  async getTeamsAsync(userId) {
    // Note that userId is unused because we use the
    // /me version of the API.  So it just returns
    // the Teams that the logged in users is a member of.
    const joinedTeams = await this.graphClient
      .api('/me/joinedTeams')
      .version('beta')
      .select('id,displayname')
      .get();

    const teams = [];
    for (let team of joinedTeams.value) {
      teams.push({id: team.id, name: team.displayName});
    }
    return teams;
  }

  async getTeamsChannelsAsync(teamId) {
    const channels = await this.graphClient
    .api(`/teams/${teamId}/channels`)
    .version('beta')
    .select('id,displayname')
    .get();

    const teamsChannels = [];
    for (let channel of channels.value) {
      teamsChannels.push({id: channel.id, name: channel.displayName})
    }
    return teamsChannels;
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  // Prompt the user to sign in and
  // grant consent to the requested permission scopes
  async signIn(): Promise<void> {
    try {
      const result = await this.msalService.loginPopup(OAuthSettings.scopes);
      if (result) {
        this.authenticated = true;
        await this.initGraphAsync();
        await this.setUser();
      }
    } catch (error) {
      console.error('Login failed', JSON.stringify(error, null, 2));
    }
  }

  // Sign out
  signOut(): void {
    const result = this.msalService.logout();
    this.user = null;
    this.authenticated = false;
  }

  // Silently request an access token
  async getAccessTokenAsync(): Promise<string> {
    let result = await this.msalService.acquireTokenSilent(OAuthSettings.scopes)
      .catch((reason) => {
        console.error('Get token failed', JSON.stringify(reason, null, 2));
      });

    return result;
  }

  public getUser(): User {
    return this.user;
  }

  public async getUserAsync(): Promise<User> {
    if(!this.user) {
      await this.setUser();
    }
    return this.user;
  }

  private async setUser(): Promise<User> {
    if (!this.authenticated) return null;

    try {
      // Get the user from Graph (GET /me)
      let graphUser = await this.graphClient.api('/me').get();

      this.user = new User();
      this.user.token = this.accessToken;
      console.error("accessToken = " + this.accessToken);
      this.user.displayName = graphUser.displayName;
      // Prefer the mail property, but fall back to userPrincipalName
      this.user.email = graphUser.mail || graphUser.userPrincipalName;
      this.user.id = graphUser.id;

    } catch (error) {
      console.error("Error setting user: " + util.inspect(error))
    }
  }
}
