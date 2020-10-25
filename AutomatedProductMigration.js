const { count } = require('console'), Bot = require('./Bot.js'), { Agent } = require('http'), Shopify = require('./Shopify.js'), puppeteer = require('puppeteer'), Amazon = require('./Amazon.js');

start()

async function start()
{    
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'], defaultViewport: null})
    const ShopifyPage = await browser.newPage()

    await Bot.grabBotConfigs(ShopifyPage)
    await Shopify.logInToShopify(ShopifyPage)

    const AmazonPage = await browser.newPage()

    let numberOfProducts = await Amazon.getNumberOfProductsToMigrate(AmazonPage)
    for(let counter = 0; counter < numberOfProducts; counter++)
    {
        try
        {
            let newProduct = await Amazon.scrapeAmazonItems(AmazonPage, counter)
            await Shopify.listProductOnShopify(ShopifyPage, newProduct)
            await AmazonPage.waitForTimeout(1000)
        }
        catch(exception)
        {
            //do nothing because we handle everything earlier, we just need what is inside of this try block to be treated as transactional
            //essentially is a psuedo transactional implmentation
            //we need the space because the exception could have the execution stack attached
            if(exception != "Item Already Listed ") 
            {
                console.log(`Exception encountered: ${exception}`)
                await AmazonPage.waitForTimeout(5000)
            }            
        }
        console.log(`Progress: ${counter}\\${numberOfProducts}`)
    }
}