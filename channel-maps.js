'use strict'
var util = require('util')

// Pesist the following to redis:
// Last polled time for each Teams channel
// Map of Teams {teamId, channelId} -> Slack channelId
// Map of Slack channelId -> Teams {teamId, channelId}
// Map of Teams {teamId, channelId, messageId} -> Slack messageId 
var redisDB = require("redis")
var redis = redisDB.createClient();

// TODO - remove these
const slackTest = "fb5cb1df-ad0a-4ae4-b979-21db4a48f68c"
const teamsGeneral = "19:fb442837eaa74fd4ae81ed89c5e39cf6@thread.skype"
const slackGeneral = "C7F9N62KS"

redis.set("ChannelMap/" + createTeamsChannelKey(slackTest, teamsGeneral), slackGeneral)
redis.set("ChannelMap/" + slackGeneral, createTeamsChannelKey(slackTest, teamsGeneral))
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
    return { teamId: keyArray[0], teamsChannelId: keyArray[1], teamsMessageId: keyArray[2]}
}

module.exports = {
    mapChannels: function (teamId, teamsChannelId, slackChannelId) {
        redis.set("ChannelMap/" + createTeamsChannelKey(teamId, teamsChannelId), slackChannelId)
        redis.set("ChannelMap/" + slackChannelId, createTeamsChannelKey(teamId, teamsChannelId))
    },

    getSlackChannel: function (teamId, teamsChannelId) {
        return redis.get("ChannelMap/" + createTeamsChannelKey(teamId, teamsChannelId))
    },

    getTeamsChannel: function (slackChannelId) {
        return redis.get("ChannelMap/" + slackChannelId)
    },

    // Return list of Teams channels in tuple-like object literals:
    // {teamId: abc, teamsChannelId: xyz}
    getTeamsChannels: function () {
        let channels = []
        // TODO - change to SCAN rather than KEYS
        redis.keys('ChannelMap/', () => {
            channels.push(splitTeamsChannelKey(compoundKey))
        })
        return channels
    },

    setLastPolledTime: function (teamId, teamsChannelId, date) {
        redis.set("LastPolledTime/" + createTeamsChannelKey(teamId, teamsChannelId), date)
    },

    getLastPolledTime: function (teamId, teamsChannelId) {
        redis.get("LastPolledTime/" + createTeamsChannelKey(teamId, teamsChannelId))
    },

    getSlackMessageId: function (teamId, teamsChannelId, teamsMessageId) {
        redis.get(createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId))
    },

    setSlackMessageId: function (slackMessageId, teamId, teamsChannelId, teamsMessageId) {
        redis.set(createTeamsMessageKey(teamId, teamsChannelId, teamsMessageId), slackMessageId)
    }
};
