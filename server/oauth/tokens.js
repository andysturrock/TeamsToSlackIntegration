'use strict'
const util = require('util')
const querystring = require('qs');
const https = require('https');
const logger = require('pino')()

module.exports = {
  getAccessTokenAsync: async function (req) {
    if (req.user) {
      // Get the stored token
      const storedToken = req.user.oauthToken;
      if (storedToken) {
        if (storedToken.expired()) {
          // refresh token
          const newToken = await storedToken.refresh();

          // Update stored token
          req.user.oauthToken = newToken;
          return newToken.token.access_token;
        }

        // Token still valid, just return it
        return storedToken.token.access_token;
      }
    }
  },

  getRefreshedTokenAsync: async function (storedToken) {
    if (storedToken) {
      if (storedToken.expired()) {
        // refresh token
        const newToken = await storedToken.refresh();

        // Update stored token
        return newToken.token.access_token;
      }

      // Token still valid, just return it
      return storedToken.token.access_token;
    }
  },

  getOnBehalfOfTokenAsync: async function (accessToken) {
    return new Promise((resolve, reject) => {

      const postData = querystring.stringify({
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'client_id': process.env.OAUTH_APP_ID,
        'client_secret': process.env.OAUTH_APP_PASSWORD,
        'assertion': accessToken,
        'scope': `${process.env.OAUTH_GRAPH_SCOPES}`,
        'requested_token_use': 'on_behalf_of'
      });

      const options = {
        hostname: 'login.microsoftonline.com',
        method: 'POST',
        path: `/${process.env.OAUTH_TENANT_ID}/oauth2/v2.0/token`,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': postData.length
        }
      };

      var req = https.request(options, (res) => {
        res.on('data', (data) => {
          const response = JSON.parse(new String(data))
          if(response.error) {
            reject(response)
          }
          resolve(response)
        });
      });

      req.on('error', (error) => {
        reject(error)
      });

      req.write(postData);
      req.end();
    })
  }

};