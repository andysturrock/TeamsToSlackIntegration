# TeamsToSlackIntegration
Send messages back and forth between Slack and Teams channels

## Steps required before running...
1. Install a bot into Slack.  The easiest way is to use [Hubot](https://slack.com/apps/A0F7XDU93-hubot).
  Or you can create your own.
  At some point I might create one and put it in the Slack directory.
  Anyway, you need a bot user, installed in the workspace and channels you want to send/receive to/from Teams.
2. Register an app in Azure Active Directory for your bot:
    1. Go to https://portal.azure.com/#blade/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/RegisteredApps and click "new registration"
    2. Call it SlackBot in the Name box
    3. Select "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
    4. Ignore the "Redirect URI" section
    5. Click "Register"
    6. Click "Certificates and secrets"
    7. Click "New client secret"
    8. Put something in the description like "Slackbot Never expires secret"
    9. Select "Never" for expiry
    10. Click "Add"
    11. **Copy the secret value.**  You only get one chance at this or you'll have to generate another secret.
3. Create a bot in Teams:
    1. Edit the manifest.json.sample file in the SlackBot directory and replace bot_id_here with the application (client) ID of your app.  Rename manifest.json.sample to manifest.json.
    2. Create a zip file of the SlackBot directory from within the directory: `cd SlackBot; zip SlackBot.zip outline.png color.png manifest.json`.
    3. Go to Teams and click the ... icon next to your team and select "Manage team"
    4. Click the Apps tab
    5. At the bottom right of the screen click "Upload a custom app"
    6. Select your zipfile and load it
    7. Click SlackBot (Custom app) from the list of apps
    8. Click "Open" next to "Add to a team"
    9. Select the channel to add SlackBot to
    10. Click "Set up" and you will be redirected back to your team
4. Register the server app in Azure Active Directory:
    1. Follow the steps in 2. above except call the app something like "Slack/Teams Integration Server"
    2. Click "Authentication"
    3. In the Implicit grant section, click both "Access tokens" and "ID tokens"
    4. Save
    5. Click "API permissions"
    7. Add the following Microsoft Graph permissions: Group.Read.All, Group.ReadWrite.All, User.Read, offline_access
    8. Ask your tenant admin to grant admin consent for your tenant
    9. Click "Expose an API"
    10. Create the two following scopes:  Mappings.Add, Mappings.Delete.  You can put sensible text in the text boxes
    11. Save
5. Register the client app in Azure Active Directory:
    1. Follow the steps in 2. above except call the app something like "Slack/Teams Integration Client"
    2. Click "Authentication"
    3. In the Redirect URIs section add a redirect URI.  For development, use "http://localhost:4200"
    4. In the Implicit grant section, click both "Access tokens" and "ID tokens"
    5. Save
    6. Click "API permissions"
    7. Add the following Microsoft Graph permissions: Group.Read.All, User.Read, User.Read.All, offline_access
    8. Add your two Mappings.Add and Mappings.Delete permissions
    9. Ask your tenant admin to grant admin consent for your tenant
    10. Go back to the "Expose and API" settings the server and add the client as an authorized client application
6. Add the app IDs and secrets to the config files
    1. Edit client/src/oauth.ts and add the client application ID from Active Directory
    2. In the server edit the env.sample file replacing the relevent settings.  Rename env.sample to ".env"
7. Run the client and server.  For development you might want to use:
    1. `cd client; ng serve`
    2. `cd server; npm start | ./node_modules/.bin/pino-pretty`
    
    
