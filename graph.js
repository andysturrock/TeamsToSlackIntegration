var graph = require('@microsoft/microsoft-graph-client');
var util = require('util')

module.exports = {

  getUserDetails: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client.api('/me').get();
    return user;
  },

  getTeamsAndChannelsAsync: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    try {
      var teamsAndChannels = []
      const teams = await getMyTeamsAsync(client)
      for (team of teams.value) {
        channels = await getChannelsInTeamAsync(client, team.id)
        teamsAndChannels.push({ id: `${team.id}`, displayName: `${team.displayName}`, channels: channels.value })
      }
      return teamsAndChannels;
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  },

  getMessagesAfterAsync: async function (accessToken, teamId, channelId, date) {
    const allMessages = await this.getMessagesAsync(accessToken, teamId, channelId)
    if(!date) {
      return allMessages
    }
    const messagesAfter = []
    allMessages.forEach(message => {
      let messageCreatedDateTime = new Date(message.createdDateTime)
      if(messageCreatedDateTime > date) {
        // Messages seem to be returned fairly reliably in last->first order
        // So put them in our array at the end so the array is sorted
        // first -> last when we return it.
        messagesAfter.unshift(message)
      }
    });
    return messagesAfter
  },

  getMessagesAsync: async function (accessToken, teamId, channelId) {
    const client = getAuthenticatedClient(accessToken);

    try {
      const messages = await getMessagesInChannelAsync(client, teamId, channelId)
      return messages;
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  },

  getRepliesAfterAsync: async function (accessToken, teamId, channelId, messageId, date) {
    const allReplies = await this.getRepliesAsync(accessToken, teamId, channelId, messageId)
    if(!date) {
      return allReplies
    }
    const repliesAfter = []
    allReplies.forEach(reply => {
      if(reply.createdDateTime >= date) {
        repliesAfter.push(reply)
      }
    });
    return repliesAfter
  },

  getRepliesAsync: async function (accessToken, teamId, channelId, messageId) {
    const client = getAuthenticatedClient(accessToken);

    try {
      const replies = await getMessageRepliesAsync(client, teamId, channelId, messageId)
      return replies;
    }
    catch (error) {
      console.log("Error: " + util.inspect(error))
    }
  }
};

async function getMyTeamsAsync(client) {
  const teams = await client
    .api('/me/joinedTeams')
    .version('beta')
    .select('id,displayname')
    .get();

  return teams;
}

async function getChannelsInTeamAsync(client, teamId) {
  const channels = await client
    .api(`/teams/${teamId}/channels`)
    .version('beta')
    .select('id,displayname')
    .get();

  return channels;
}

async function getMessagesInChannelAsync(client, teamId, channelId) {
  let messages = [];

  messagesData = await client
    .api(`/teams/${teamId}/channels/${channelId}/messages`)
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

async function getMessageRepliesAsync(client, teamId, channelId, messageId) {
  let replies = [];

  const repliesData = await client
    .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
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