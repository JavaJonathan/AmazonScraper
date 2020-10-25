var request = require('request'), puppeteer = require('puppeteer'), readWrite = require('fs');
const { WebClient } = require('@slack/web-api');

class Bot
{    
    shopifyUsername;
    shopifyPassword;
    slackSecret;

    constructor(){}

    static async backUpListedItems(page, listedItems)
    {
        let botConfigs
        let lastHourBackedUp

        readWrite.readFile('botConfigs.json', (error, configs) => 
        {
            if(error) throw error

            botConfigs = JSON.parse(configs)
        })

        await page.waitForTimeout(2000)

        lastHourBackedUp = botConfigs[0].LastHourListedLogBackedUp
        let hour = new Date()
        hour = hour.getHours()

        if(hour != lastHourBackedUp)
        {
            readWrite.writeFile('logs/ListedItemsLogBackUp.json', JSON.stringify(listedItems), (error) => 
            {
                if(error) throw error
            })

            await page.waitForTimeout(1000)
            botConfigs[0].LastHourListedLogBackedUp = hour
            console.log(botConfigs[0].LastHourListedLogBackedUp)

            readWrite.writeFile('botConfigs.json', JSON.stringify(botConfigs), (error) => 
            {
                if(error) throw error
            })

            console.log('Listed Items Log has been backed up.')
        }
    }

    static async backUpErrorLog(page, errorLog)
    {
        let botConfigs
        let lastHourBackedUp

        readWrite.readFile('botConfigs.json', (error, configs) => 
        {
            if(error) throw error

            botConfigs = JSON.parse(configs)
        })

        await page.waitForTimeout(1000)

        lastHourBackedUp = botConfigs[0].LastHourErrorLogBackedUp
        let hour = new Date()
        hour = hour.getHours()

        if(hour != lastHourBackedUp)
        {
            readWrite.writeFile('logs/ErrorProductLogBackUp.json', JSON.stringify(errorLog), (error) => 
            {
                if(error) throw error
            })

            await page.waitForTimeout(1000)

            botConfigs[0].LastHourErrorLogBackedUp = hour

            readWrite.writeFile('botConfigs.json', JSON.stringify(botConfigs), (error) => 
            {
                if(error) throw error
            })
            console.log('Error Product Log has been backed up.')
        }
    }

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

    static async getNextSku(page)
    {
        let botConfigs

        readWrite.readFile('botConfigs.json', (error, configs) => 
        {
            if(error) throw error

            botConfigs = JSON.parse(configs)
        })

        await page.waitForTimeout(1000)

        botConfigs[0].sku = botConfigs[0].sku + 1

        readWrite.writeFile('botConfigs.json', JSON.stringify(botConfigs), (error) => 
        {
            if(error) throw error
        })

        await page.waitForTimeout(1000)

        return botConfigs[0].sku
    }

    static async LogProductError(page, asin, message)
    {
        let errorLog

        readWrite.readFile('logs/ErrorProductLog.json', (error, log) => 
        {
            if(error) throw error

            errorLog = JSON.parse(log)
        })

        await page.waitForTimeout(1000)

        let newLogEntry = {'Asin': asin, 'Time': new Date().toLocaleString(), 'Message': message}

        errorLog.push(newLogEntry)

        readWrite.writeFile('logs/ErrorProductLog.json', JSON.stringify(errorLog), (error) => 
        {
            if(error) throw error
        })

        console.log(`------------------------------\nError Logged for Asin: ${asin} \n------------------------------`)

        await this.backUpErrorLog(page, errorLog)
    }

    static async LogListedItem(page, Product)
    {
        let listedItemLog

        readWrite.readFile('logs/ListedItemsLog.json', (error, log) => 
        {
            if(error) throw error

            listedItemLog = JSON.parse(log)
        })

        await page.waitForTimeout(1000)

        let newLogEntry = 
        {
            'Asin': Product.Asin, 
            'TimeListed': new Date().toLocaleString(),
            'Sku': Product.SKU,
            'Title': Product.Title,
            'Description': Product.Description,
            'ImageLinks': Product.ImageLinks,
            'UPC': Product.UPC,
            'Price': Product.Price,
            'Brand': Product.Brand,
            'Ingredients': Product.Ingredients
        }   

        listedItemLog.push(newLogEntry)

        readWrite.writeFile('logs/ListedItemsLog.json', JSON.stringify(listedItemLog), (error) => 
        {
            if(error) throw error
        })

        await this.backUpListedItems(page, listedItemLog)

        return `Success! ${Product.asin} has been listed.`
    }

    static async CheckIfItemHasBeenListed(page, asin)
    {
        let items
        readWrite.readFile('logs/ListedItemsLog.json', (error, itemsListed) => 
        {
            if(error) throw error

            items = JSON.parse(itemsListed)
        })

        await page.waitForTimeout(1000)

        for(let counter = 0; counter < items.length; counter++)
        {
            if(items[counter].Asin == asin)
            {
                return true
            }
        }      

        return false
    }

    static async sendSlackMessage(slackMessage)
    {
        const token = this.slackSecret
        const web = new WebClient(token)
        const conversationId = 'C01CTSMB4KZ';
        const res = await web.chat.postMessage({ channel: conversationId, text: slackMessage });
        console.log('Message sent' + "\n------------------------------");
    }
}

module.exports = Bot