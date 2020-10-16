var request = require('request'), puppeteer = require('puppeteer'), readWrite = require('fs');
const { WebClient } = require('@slack/web-api');

class Bot
{    
    shopifyUsername;
    shopifyPassword;
    slackSecret;

    constructor(){}

    static async grabBotConfigs(page)
    {
        let botConfigs

        readWrite.readFile('botConfigs.json', (error, configs) => 
        {
            if(error) throw error

            botConfigs = JSON.parse(configs)
        })

        await page.waitForTimeout(1000)

        this.shopifyUsername = botConfigs[0].username
        this.shopifyPassword = botConfigs[0].password
        this.slackSecret = botConfigs[0].slackSecret

        return botConfigs[0]
    }

    static async sendSlackMessage(slackMessage)
    {
        const token = this.slackSecret
        const web = new WebClient(token)
        const conversationId = 'C01CU868ARX';
        const res = await web.chat.postMessage({ channel: conversationId, text: slackMessage });
        console.log('Message sent: ', res.ts);
    }
}

module.exports = Bot