var request = require('request'), puppeteer = require('puppeteer'), readWrite = require('fs');
const Shopify = require('./Shopify.js'), Amazon = require('./Amazon.js');

class Bot
{    
    shopifyUsername;
    shopifyPassword;

    constructor(){}

    static async start()
    {
        const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'], defaultViewport: null})

        const ShopifyPage = await browser.newPage()

        await this.grabBotConfigs(ShopifyPage)
        await this.logInToShopify(ShopifyPage)

        const AmazonPage = await browser.newPage()

        await this.findAndListProducts(ShopifyPage, AmazonPage)
    }

    static async findAndListProducts(ShopifyPage, AmazonPage)
    {
        let numberOfProducts = await Amazon.getNumberOfProductsToMigrate(AmazonPage)
        for(let counter = 0; counter < numberOfProducts; counter++)
        {
            let newProduct = await Amazon.scrapeAmazonItems(AmazonPage, counter)
            await Shopify.listProductOnShopify(ShopifyPage, newProduct)
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
    }

    static async logInToShopify(page)
    {
        await page.goto('https://pbdcollectibles.myshopify.com/admin/products/new', { waitUntil: 'networkidle2' })
        await page.type('input[id="account_email"]', `${this.shopifyUsername}`, {delay: 25})
        await page.waitForTimeout(3000)
        await page.click('button[name="commit"]')
        await page.waitForSelector('input[id="account_password"]')
        await page.type('input[id="account_password"]', `${this.shopifyPassword}`, {delay: 25})
        await page.waitForTimeout(3000)
        await page.click('button[name="commit"]')
    }
}

module.exports = Bot