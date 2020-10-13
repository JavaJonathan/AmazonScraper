const Product = require('./AmazonProduct.js'), Bot = require('./Bot.js'), readWrite = require('fs')
const { listProductsOnShopify } = require('./Shopify.js')
const Shopify = require('./Shopify.js')
const { Console } = require('console')

class Amazon 
{
    static products = []
    jsonProducts = []

    constructor(){}    

    static async scrapeAmazonItems(AmazonPage, Index)
    {   
        try
        {
            await AmazonPage.bringToFront()
            await AmazonPage.goto("https://www.amazon.com/s?me=A35CSG8GBUTFQU&fbclid=IwAR0ydIgERsEWj1VgWBm09m8rme8dWxq5zrJ7ybRpkBwKQUrhTVfZdPccYPw&marketplaceID=ATVPDKIKX0DER#ace-9766277718", { waitUntil: 'networkidle2' })
            await this.getPassedBotCheck(AmazonPage)

            await AmazonPage.waitForTimeout(250)
            await this.findProductByAsin(AmazonPage, this.jsonProducts[Index].asin1)

            let newProduct = await this.scrapeProductPage(AmazonPage)
            await AmazonPage.waitForTimeout(250)

            return newProduct
        }
        catch(exception){ Console.log(exception) }
    }

    static async getNumberOfProductsToMigrate(AmazonPage)
    {
        this.jsonProducts = await this.getJsonProducts(AmazonPage)
        return this.jsonProducts.length
    }

    static async findProductByAsin(page, asin)
    {
        //we need to clear the text box first lol amazon
        try
        {
            await page.click('input[id="twotabsearchtextbox"]', {clickCount: 4})
            await page.type('input[id="twotabsearchtextbox"]', `${asin}`, {delay: 25})
            await page.click('span[id="nav-search-submit-text"]')
            await page.waitForSelector('span[class="a-size-medium a-color-base a-text-normal"]', { timeout: 1000 })
            await page.waitForTimeout(250)
            await page.click('span[class="a-size-medium a-color-base a-text-normal"]')
        }
        catch(Exception)
        {
            throw "Could Not Find Product"
        }
    }

    static async getJsonProducts(page)
    {
        readWrite.readFile('JsonProducts.json', (error, products) => 
        {
            if(error) throw error

            this.jsonProducts = JSON.parse(products)
        })

        await page.waitForTimeout(1000)

        return this.jsonProducts.Sheet1
    }

    static async getPassedBotCheck(page)
    {
        try
        {
            await page.waitForSelector('input[id="twotabsearchtextbox"]')
        }
        catch(exception)
        {
            throw "Stuck At Bot Check"
        }
    }

    static async scrapeProductPage(page)
    {
        let title = await this.scrapeAmazonTitle(page)
        let imageUrls = await this.scrapeAmazonImages(page)
        let descriptions = await this.scrapeAmazonDescription(page)
        let UPC = await this.scrapeAmazonUPC(page)
        let price = await this.scrapeAmazonPrice(page)
        let brand = await this.scrapeAmazonBrand(page)
        
        console.log(title, imageUrls, descriptions, UPC, price, brand)

        return new Product(title, imageUrls, descriptions, UPC, price, brand)
    }

    static async scrapeAmazonBrand(page)
    {    
        let brandElement = await page.$('a[id="bylineInfo"]')
        let brand = await page.evaluate(el => el.textContent, brandElement)

        return brand.replace("Visit the ", "").replace(" Store", "")
    }

    static async scrapeAmazonPrice(page)
    {    
        let priceElement = await page.$('span[id="priceblock_ourprice"]')
        let price = await page.evaluate(el => el.textContent, priceElement)
        return price
    }

    static async scrapeAmazonUPC(page)
    {
        let detailElements = await page.$$('div[id="detailBullets_feature_div"] ul li')
        await page.waitForTimeout(500)

        let UPC = ""

        for(let counter = 0; counter < detailElements.length; counter++)
        {
            let detailElement = await detailElements[counter].$$('span span')
            let detail;

            try{ detail = await page.evaluate(el => el.textContent, detailElement[0]) }
            catch(Exception) { continue }

            if(detail.replace("\n", "") == "UPC:")
            {
                let upcElement = await detailElements[counter].$$('span span')
                UPC = await page.evaluate(el => el.textContent, upcElement[1])
            }
        }

        return UPC
    }

    static async scrapeAmazonDescription(page)
    {
        let descriptions = []
        
        let descriptionElements = await page.$$('div[id="feature-bullets"] ul li')

        for(let counter = 0; counter < descriptionElements.length; counter++)
        {
            let decriptionElement = await descriptionElements[counter].$('span')
            let description = await page.evaluate(el => el.textContent, decriptionElement)
            
            //replaces all instances
            descriptions.push(description.replace(/\n/g, ""))
        }

        return descriptions
    }

    static async scrapeAmazonImages(page)
    {
        await page.waitForSelector('li[class="a-spacing-small item imageThumbnail a-declarative"]')
        let pictureElements = await page.$$('li[class="a-spacing-small item imageThumbnail a-declarative"]')

        let imageUrls = []

        for(let counter = 0; counter < pictureElements.length; counter++)
        {
            page.waitForTimeout(500)
            await pictureElements[counter].click()
            let image = await page.$$('div[class="imgTagWrapper"] img')
            let imageUrl = await page.evaluate(el => el.src, image[counter])
            
            imageUrls.push(imageUrl)
        }

        return imageUrls
    }

    static async scrapeAmazonTitle(page)
    {
        await page.waitForSelector('span[id="productTitle"]')
        let titleElement = await page.$('span[id="productTitle"]')
        let title = await page.evaluate(el => el.textContent, titleElement)

        return title.trim()
    }
}

module.exports = Amazon
