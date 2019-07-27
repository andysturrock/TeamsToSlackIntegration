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
      const messages = await getMessagesInChannel(client, team_id, channel_id)
      return messages;
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  },

  getReplies: async function (accessToken, team_id, channel_id, message_id) {
    const client = getAuthenticatedClient(accessToken);

    try {
      const replies = await getMessageReplies(client, team_id, channel_id, message_id)
      return replies;
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
  let messages = [];

  messagesData = await client
    .api(`/teams/${team_id}/channels/${channel_id}/messages`)
    .version('beta')
    .top(1)
    .get();

  messages = messages.concat(messagesData.value)

  let nextLink = messagesData['@odata.nextLink'] ?
    messagesData['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') :
    false;

  while (nextLink) {
    const nextMessagesData = await client
      .api(nextLink)
      .version('beta')
      .top(1)
      .get();

    if (nextMessagesData.value.length > 0) {
      messages = messages.concat(nextMessagesData.value)
    }
    nextLink = nextMessagesData['@odata.nextLink'] ?
      nextMessagesData['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') :
      false;
  }

  return messages;
}

async function getMessageReplies(client, team_id, channel_id, message_id) {
  let replies = [];

  const repliesData = await client
    .api(`/teams/${team_id}/channels/${channel_id}/messages/${message_id}/replies`)
    .version('beta')
    .top(1)
    .get();

  replies = replies.concat(repliesData.value)

  let nextLink = repliesData['@odata.nextLink'] ?
    repliesData['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') :
    false;

  while (nextLink) {
    const nextRepliesData = await client
      .api(nextLink)
      .version('beta')
      .top(1)
      .get();

    if (nextRepliesData.value.length > 0) {
      replies = replies.concat(nextRepliesData.value)
    }
    nextLink = nextRepliesData['@odata.nextLink'] ?
      nextRepliesData['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') :
      false;
  }

  return replies;
}
