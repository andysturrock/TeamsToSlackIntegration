'use strict'
const graph = require('@microsoft/microsoft-graph-client');
const util = require('util')
const logger = require('pino')()

const PAGE_SIZE = 100

module.exports = {

  getUserDetails: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);

    const user = await client.api('/me').get();
    return user;
  },

  getTeamsAndChannelsAsync: async function (accessToken) {
    const client = getAuthenticatedClient(accessToken);
    const teamsAndChannels = []
    const teams = await getMyTeamsAsync(client)
    for (let team of teams.value) {
      channels = await getChannelsInTeamAsync(client, team.id)
      teamsAndChannels.push({ id: `${team.id}`, displayName: `${team.displayName}`, channels: channels.value })
    }
    return teamsAndChannels;
  },

  getMessagesAfterAsync: async function (accessToken, teamId, channelId, date) {
    const allMessages = await this.getMessagesAsync(accessToken, teamId, channelId)
    if (!date) {
      return allMessages
    }
    const messagesAfter = []
    if (!allMessages) {
      return messagesAfter
    }
    allMessages.forEach(message => {
      let messageCreatedDateTime = new Date(message.createdDateTime)
      if (messageCreatedDateTime > date) {
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
    const messages = await getMessagesInChannelAsync(client, teamId, channelId)
    return messages;
  },

  getRepliesAfterAsync: async function (accessToken, teamId, channelId, messageId, date) {
    const allReplies = await this.getRepliesAsync(accessToken, teamId, channelId, messageId)
    if (!date) {
      return allReplies
    }
    const repliesAfter = []
    if (!allReplies) {
      return repliesAfter
    }
    allReplies.forEach(reply => {
      let replyCreatedDateTime = new Date(reply.createdDateTime)
      if (replyCreatedDateTime > date) {
        repliesAfter.unshift(reply)
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
      logger.error("getRepliesAsync() %o", error)
      throw (error)
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

  const url = `/teams/${teamId}/channels/${channelId}/messages`
  let messagesData = await client
    .api(url)
    .version('beta')
    .top(PAGE_SIZE)
    .get();

  messages = messages.concat(messagesData.value)

  let nextLink = messagesData['@odata.nextLink'] ?
    messagesData['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') :
    false;

  while (nextLink) {
    const nextMessagesData = await client
      .api(nextLink)
      .version('beta')
      .top(PAGE_SIZE)
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
    .top(PAGE_SIZE)
    .get();

  replies = replies.concat(repliesData.value)

  let nextLink = repliesData['@odata.nextLink'] ?
    repliesData['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') :
    false;

  while (nextLink) {
    const nextRepliesData = await client
      .api(nextLink)
      .version('beta')
      .top(PAGE_SIZE)
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
    },
    // debugLogging: true
  });

  return client;
}