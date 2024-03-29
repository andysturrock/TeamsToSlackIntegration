'use strict'
const graph = require('@microsoft/microsoft-graph-client');
const util = require('util')
const https = require('https')
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

  // Get last X messages from the channel
  getLastXMessagesAsync: async function (accessToken, teamId, channelId, lastX) {
    const client = getAuthenticatedClient(accessToken);
    const url = `/teams/${teamId}/channels/${channelId}/messages`
    let messagesData = await client
      .api(url)
      .version('beta')
      .top(lastX)
      .get();

    return messagesData.value
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
    const replies = await getMessageRepliesAsync(client, teamId, channelId, messageId)
    return replies;
  },

  postBotReplyAsync: async function (token, teamsChannelId, replyToId, message) {
    _postBotMessage(token, teamsChannelId, replyToId, message)
  },
  postBotMessageAsync: async function (token, teamsChannelId, message) {
    _postBotMessage(token, teamsChannelId, null, message)
  },

  postMessageAsync: async function (accessToken, teamId, channelId, message) {
    const client = getAuthenticatedClient(accessToken);

    const chatMessage = {
      "subject": "From Slack",
      "body": { content: message },
      "from": {
        device: null,
        user: null,
        conversation: null,
        application:
        {
          id: 'ace0263e-0db8-469b-b4d7-42e7eae09038',
          displayName: 'slackbot',
          applicationIdentityType: 'bot'
        }
      }

    }
    const response = await client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .version('beta')
      .post(chatMessage);

    logger.info("response = " + util.inspect(response))
    return response;
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

async function _postBotMessage(token, teamsChannelId, replyToId, message) {
  return new Promise((resolve, reject) => {

    const data = JSON.stringify({
      "type": "message",
      "text": message,
      "textFormat": "xml"
    })

    const path = replyToId ?
      `/uk/v3/conversations/${teamsChannelId};messageid=${replyToId}/activities/` :
      `/uk/v3/conversations/${teamsChannelId}/activities/`
    const options = {
      hostname: 'smba.trafficmanager.net',
      method: 'POST',
      path: path,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
    var req = https.request(options, (res) => {
      res.on('data', (data) => {
        const response = JSON.parse(new String(data))
        if (response.error) {
          logger.error("Error posting bot reply: " + util.inspect(response.error))
          reject(response)
        }
        resolve(response)
      })
    })

    req.on('error', (error) => {
      logger.error("Error posting bot reply: " + util.inspect(error))
      reject(error)
    })

    req.write(data);
    req.end();
  })
}