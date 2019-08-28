'use strict'
const util = require('util')
const logger = require('pino')()
const moment = require('moment');
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
const zaddAsync = promisify(client.zadd).bind(client);
const scanAsync = promisify(client.scan).bind(client);
const zscanAsync = promisify(client.zscan).bind(client);
const zremrangebyscore = promisify(client.zremrangebyscore).bind(client);
const REDIS_SCAN_COUNT = 100
const REDIS_TEAMS_MESSAGE_EXPIRY_SECONDS = 60 * 60 * 24 * 5 // 5 days

function createTeamsChannelKey(teamId, teamsChannelId) {
    return `${teamId}/${teamsChannelId}`
}

function createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId) {
    return `${teamId}/${teamsChannelId}/${teamsMessageId}`
}

function createSlackMessageKey(workspaceId, slackChannelId, slackMessageId) {
    return `${workspaceId}/${slackChannelId}/${slackMessageId}`
}

async function getAllKeys(pattern) {
    let keys = []
    let cursor = 0
    while (true) {
        const result = await scanAsync(cursor,
            'MATCH', pattern,
            'COUNT', REDIS_SCAN_COUNT)
        cursor = result[0]
        keys = keys.concat(result[1])
        if (cursor == 0) {
            break
        }
    }
    return keys
}

async function deleteOldMessages() {
    const now = moment().utc().unix()

    const keys = await getAllKeys('TeamsMessages/*')
    for (let key of keys) {
        const numDeleted = await zremrangebyscore(key, 0, now)
        logger.info(`Deleted ${numDeleted} messages from ${key}`)
    }
}
// Run every 5 minutes
setInterval(deleteOldMessages, 5000 * 60);

module.exports = {

    /////////////////////////////////////////////////////////////////////////
    // Set and get last time we saw a message in a Teams channel
    //
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
    //
    /////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////
    // Set and get last time we saw a reply in a Teams channel
    //
    setLastReplyTimeAsync: async function (teamId, teamsChannelId, teamsMessageId, date) {
        await setAsync("TeamsMessageId2LastReplyTime/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId),
            JSON.stringify(date),
            "EX", REDIS_TEAMS_MESSAGE_EXPIRY_SECONDS)
    },

    getLastReplyTimeAsync: async function (teamId, teamsChannelId, teamsMessageId) {
        const date = await getAsync("TeamsMessageId2LastReplyTime/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId))
        return date ? new Date(JSON.parse(date)) : date
    },
    //
    /////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////
    //
    // Set and get a mapping between a Slack message ID and a Teams message ID
    //
    // Simple key/value stores have built in TTL functionality.
    // Use the same values as the sorted sets TTL.
    setSlackMessageIdAsync: async function (teamId, teamsChannelId, teamsMessageId, slackMessageId) {
        await setAsync("TeamsMessageId2SlackMessageId/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId),
            slackMessageId,
            "EX", REDIS_TEAMS_MESSAGE_EXPIRY_SECONDS)
    },
    // The Slack message ID is unique because we only allow one-to-one mappings of Teams<->Slack channels
    // If we ever allow many-to-many mappings we'll have to include Slack workspace ID and channel ID.
    getSlackMessageIdAsync: async function (teamId, teamsChannelId, teamsMessageId) {
        return await getAsync("TeamsMessageId2SlackMessageId/" + createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId))
    },
    //
    /////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////
    //
    // Set and get a mapping between a Slack message ID and a Teams message ID
    //
    setTeamsMessageIdAsync: async function (workspaceId, slackChannelId, slackMessageId, teamsMessageId) {
        await setAsync("SlackMessageId2TeamsMessageId/" + createSlackMessageKey(workspaceId, slackChannelId, slackMessageId),
            teamsMessageId,
            "EX", REDIS_TEAMS_MESSAGE_EXPIRY_SECONDS)
    },
    // Ditto comment re Slack message ID but for Teams message ID.  Ie...
    // The Teams message ID is unique because we only allow one-to-one mappings of Teams<->Slack channels
    // If we ever allow many-to-many mappings we'll have to include Teams team ID and channel ID.
    getTeamsMessageIdAsync: async function (workspaceId, slackChannelId, slackMessageId) {
        return await getAsync("SlackMessageId2TeamsMessageId/" + createSlackMessageKey(workspaceId, slackChannelId, slackMessageId))
    },
    //
    /////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////
    //
    // Save and get Teams message IDs.
    //
    addTeamsMessageIdAsync: async function (teamId, teamsChannelId, messageId) {
        // TTL is time when we'll remove this element
        const ttl = moment().add(REDIS_TEAMS_MESSAGE_EXPIRY_SECONDS, 'seconds').utc().unix()
        await zaddAsync("TeamsMessages/" + createTeamsChannelKey(teamId, teamsChannelId), ttl, messageId)
    },
    // Use the redis sorted set functionality to add a TTL as the score.
    // Then periodically sweep the set and delete all the entries with a TTL
    // older than the current time.
    getAllTeamsMessageIdsAsync: async function (teamId, teamsChannelId) {
        const messageIds = []
        let cursor = 0
        while (true) {
            const result = await zscanAsync('TeamsMessages/' + createTeamsChannelKey(teamId, teamsChannelId),
                cursor,
                'MATCH', '*',
                'COUNT', REDIS_SCAN_COUNT)
            cursor = result[0]
            const messagesAndTtls = result[1]
            for (let i = 0; i < messagesAndTtls.length; i += 2) {
                messageIds.unshift(messagesAndTtls[i])
            }
            if (cursor == 0) {
                break
            }
        }
        return messageIds
    },
    //
    /////////////////////////////////////////////////////////////////////////

    /////////////////////////////////////////////////////////////////////////
    //
    // Save, get and delete mappings between a Slack and Teams channel
    saveMapAsync: async function (channelMapping) {
        let key = "TeamsChannel2SlackChannel/" + createTeamsChannelKey(channelMapping.team.id, channelMapping.teamsChannel.id)
        await setAsync(key, JSON.stringify(channelMapping))
        key = "SlackChannel2TeamsChannel/" + channelMapping.slackChannel.id
        await setAsync(key, JSON.stringify(channelMapping))
    },

    getMapsAsync: async function () {
        return new Promise((resolve, reject) => {
            // TODO - use scan instead
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
    //
    /////////////////////////////////////////////////////////////////////////
};
