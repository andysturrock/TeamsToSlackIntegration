var graph = require('@microsoft/microsoft-graph-client');
var util = require('util')

module.exports = {
  getUserDetails: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client.api('/me').get();
    return user;
  },

  getTeamsAndChannels: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    try {
      var teamsAndChannels = []
      const teams = await getMyTeams(client)
      for (team of teams.value) {
        channels = await getChannelsInTeam(client, team.id)
        teamsAndChannels.push({ id: `${team.id}`, displayName: `${team.displayName}`, channels: channels.value })
      }
      return teamsAndChannels;
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  },

  getMessages: async function (accessToken, team_id, channel_id) {
    const client = getAuthenticatedClient(accessToken);

    try {
      messages = await getMessagesInChannel(client, team_id, channel_id)
      return messages;
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  }
};

function getAuthenticatedClient(accessToken) {
  // Initialize Graph client
  const client = graph.Client.init({
    // Use the provided access token to authenticate
    // requests
    authProvider: (done) => {
      done(null, accessToken);
    }
  });

  return client;
}

async function getMyTeams(client) {
  const teams = await client
    .api('/me/joinedTeams')
    .version('beta')
    .select('id,displayname')
    .get();

  return teams;
}

async function getChannelsInTeam(client, team_id) {
  const channels = await client
    .api(`/teams/${team_id}/channels`)
    .version('beta')
    .select('id,displayname')
    .get();

  return channels;
}

async function getMessagesInChannel(client, team_id, channel_id) {
  const messages = await client
    .api(`/teams/${team_id}/channels/${channel_id}/messages`)
    .version('beta')
    .get();

  return messages;
}
