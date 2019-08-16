'use strict'
const util = require('util')
const logger = require('pino')()
const ChannelMapping = require('./channel-mapping')

// Pesist the following to redis:
// Last polled time for each Teams channel
// Map of Teams {teamId, channelId} -> Slack channelId
// Map of Slack channelId -> Teams {teamId, channelId}
// Map of Teams {teamId, channelId, messageId} -> Slack messageId 
const redis = require("redis")
const client = redis.createClient();
const { promisify } = require('util');
const getAsync = promisify(client.get).bind(client);
const setAsync = promisify(client.set).bind(client);
const delAsync = promisify(client.del).bind(client);
const saddAsync = promisify(client.sadd).bind(client);
const smembersAsync = promisify(client.smembers).bind(client);
const sremAsync = promisify(client.srem).bind(client);

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
        console.trace("mapChannelsAsync")
        // await setAsync("TeamsChannel2SlackChannel/" + createTeamsChannelKey(teamId, teamsChannelId), slackChannelId)
        // await setAsync("SlackChannel2TeamsChannel/" + slackChannelId, createTeamsChannelKey(teamId, teamsChannelId))
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
        // which is what happens if you just set/get the object.
        return date ? new Date(JSON.parse(date)) : date
    },

    getSlackMessageIdAsync: async function (teamId, teamsChannelId, teamsMessageId) {
        return await getAsync("TeamsMessageId2SlackMessageId/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId))
    },

    setSlackMessageIdAsync: async function (teamId, teamsChannelId, teamsMessageId, slackMessageId) {
        await setAsync("TeamsMessageId2SlackMessageId/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId), slackMessageId)
    },

    setLastReplyTimeAsync: async function (teamId, teamsChannelId, teamsMessageId, date) {
        await setAsync("TeamsMessageId2LastReplyTime/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId), JSON.stringify(date))
    },

    getLastReplyTimeAsync: async function (teamId, teamsChannelId, teamsMessageId) {
        const date = await getAsync("TeamsMessageId2LastReplyTime/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId))
        return date ? new Date(JSON.parse(date)) : date
    },

    getAllMessageIdsAsync: async function (teamId, teamsChannelId) {
        const allMessageIds = await smembersAsync("TeamsMessages/" + createTeamsChannelKey(teamId, teamsChannelId))
        return allMessageIds ? allMessageIds : []
    },

    addMessageIdAsync: async function (teamId, teamsChannelId, messageId) {
        await saddAsync("TeamsMessages/" + createTeamsChannelKey(teamId, teamsChannelId), messageId)
    },

    saveMapAsync: async function (channelMapping) {
        let key = "TeamsChannel2SlackChannel/" + createTeamsChannelKey(channelMapping.team.id, channelMapping.teamsChannel.id)
        await setAsync(key, JSON.stringify(channelMapping))
        key = "SlackChannel2TeamsChannel/" + channelMapping.slackChannel.id
        await setAsync(key, JSON.stringify(channelMapping))
    },

    getMapsAsync: async function () {
        return new Promise((resolve, reject) => {
            client.keys('TeamsChannel2SlackChannel/*', async (err, keys) => {
                if (err) {
                    reject(err)
                }
                let channelMappings = []
                for (let key of keys) {
                    const channelMappingString = await getAsync(key)
                    channelMappings.push(new ChannelMapping(channelMappingString))
                }
                resolve(channelMappings)
            })
        })
    },

    deleteMapAsync: async function (channelMapping) {
        let key = "TeamsChannel2SlackChannel/" + createTeamsChannelKey(channelMapping.team.id, channelMapping.teamsChannel.id)
        await delAsync(key)
        key = "SlackChannel2TeamsChannel/" + channelMapping.slackChannel.id
        await delAsync(key)
    }
};
