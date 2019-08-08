import { Injectable } from '@angular/core';
import { MsalService } from '@azure/msal-angular';
import { Client } from '@microsoft/microsoft-graph-client';
import * as util from 'util';

import { OAuthSettings } from '../../oauth';
import { User } from '../user';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  public authenticated: boolean;
  public user: User;

  constructor(
    private msalService: MsalService) {
    this.authenticated = this.msalService.getUser() != null;
    this.getUser().then((user) => { this.user = user });
  }

  public isAuthenticated(): boolean {
    return this.authenticated;
  }

  // Prompt the user to sign in and
  // grant consent to the requested permission scopes
  async signIn(): Promise<void> {
    try {
      const result = await this.msalService.loginPopup(OAuthSettings.scopes);
      console.error('Login succeeded', JSON.stringify(result, null, 2));
      if (result) {
        this.authenticated = true;
        this.user = await this.getUser();
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
  async getAccessToken(): Promise<string> {
    let result = await this.msalService.acquireTokenSilent(OAuthSettings.scopes)
      .catch((reason) => {
        console.error('Get token failed', JSON.stringify(reason, null, 2));
      });

    return result;
  }

  private async getUser(): Promise<User> {
    if (!this.authenticated) return null;

    let graphClient = Client.init({
      // Initialize the Graph client with an auth
      // provider that requests the token from the
      // auth service
      authProvider: async (done) => {
        let token = await this.getAccessToken()
          .catch((reason) => {
            done(reason, null);
          })

        if (token) {
          done(null, token);
        } else {
          done("Could not get an access token", null);
        }
      }
    });

    // Get the user from Graph (GET /me)
    let graphUser = await graphClient.api('/me').get();

    console.error("graphUser = " + util.inspect(graphUser))

    let user = new User();
    user.displayName = graphUser.displayName;
    // Prefer the mail property, but fall back to userPrincipalName
    user.email = graphUser.mail || graphUser.userPrincipalName;
    user.id = graphUser.id;

    return user;
  }
}
