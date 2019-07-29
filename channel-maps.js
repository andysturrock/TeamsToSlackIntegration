'use strict'
var util = require('util')

// Pesist the following to redis:
// Last polled time for each Teams channel
// Map of Teams {teamId, channelId} -> Slack channelId
// Map of Slack channelId -> Teams {teamId, channelId}
// Map of Teams {teamId, channelId, messageId} -> Slack messageId 
var redis = require("redis")
var client = redis.createClient();
const { promisify } = require('util');
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);

// TODO - remove these
const slackTest = "fb5cb1df-ad0a-4ae4-b979-21db4a48f68c"
const teamsGeneral = "19:fb442837eaa74fd4ae81ed89c5e39cf6@thread.skype"
const slackGeneral = "C7F9N62KS"

client.set("TeamsChannel2SlackChannel/" + createTeamsChannelKey(slackTest, teamsGeneral), slackGeneral)
client.set("SlackChannel2TeamsChannel/" + slackGeneral, createTeamsChannelKey(slackTest, teamsGeneral))
// END TODO


function createTeamsChannelKey(teamId, teamsChannelId) {
    return `${teamId}/${teamsChannelId}`
}

function splitTeamsChannelKey(compoundKey) {
    let keyArray = compoundKey.split('/')
    return { teamId: keyArray[0], teamsChannelId: keyArray[1] }
}

function createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId) {
    return `${teamId}/${teamsChannelId}/${teamsMessageId}`
}

function splitTeamsMessageKey(compoundKey) {
    let keyArray = compoundKey.split('/')
    return { teamId: keyArray[0], teamsChannelId: keyArray[1], teamsMessageId: keyArray[2] }
}

module.exports = {
    mapChannelsAsync: async function (teamId, teamsChannelId, slackChannelId) {
        await setAsync("TeamsChannel2SlackChannel/" + createTeamsChannelKey(teamId, teamsChannelId), slackChannelId)
        await setAsync("SlackChannel2TeamsChannel/" + slackChannelId, createTeamsChannelKey(teamId, teamsChannelId))
    },

    getSlackChannelAsync: async function (teamId, teamsChannelId) {
        return await getAsync("TeamsChannel2SlackChannel/" + createTeamsChannelKey(teamId, teamsChannelId))
    },

    getTeamsChannelAsync: async function (slackChannelId) {
        return await getAsync("SlackChannel2TeamsChannel/" + slackChannelId)
    },

    // Return list of Teams channels in tuple-like object literals:
    // {teamId: abc, teamsChannelId: xyz}
    getTeamsChannelsAsync: async function () {
        return new Promise((resolve, reject) => {
            client.keys('TeamsChannel2SlackChannel/*', (err, keys) => {
                if (err) {
                    reject(err)
                }
                let channels = []
                for (let compoundKey of keys) {
                    compoundKey = compoundKey.replace('TeamsChannel2SlackChannel/', '')
                    channels.push(splitTeamsChannelKey(compoundKey))
                }
                resolve(channels)
            })
        })
    },

    setLastMessageTimeAsync: async function (teamId, teamsChannelId, date) {
        await setAsync("LastMessageTime/" + createTeamsChannelKey(teamId, teamsChannelId), JSON.stringify(date))
    },

    getLastMessageTimeAsync: async function (teamId, teamsChannelId) {
        const date = await getAsync("LastMessageTime/" + createTeamsChannelKey(teamId, teamsChannelId))
        // null gets turned into 1st Jan 1970 by the Date constructor.  We want to actually return null
        // if we don't have a date for this Teams channel.
        // The stringify and parse stuff is to stop the milliseconds being truncated
        // which is what happens if you just set/get the object
        return date ? new Date(JSON.parse(date)) : date
    },

    getSlackMessageIdAsync: async function (teamId, teamsChannelId, teamsMessageId) {
        return await getAsync("TeamsMessageId2SlackMessageId/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId))
    },

    setSlackMessageIdAsync: async function (slackMessageId, teamId, teamsChannelId, teamsMessageId) {
        await setAsync("TeamsMessageId2SlackMessageId/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId), slackMessageId)
    }
};
