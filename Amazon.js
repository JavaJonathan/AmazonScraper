const Product = require('./AmazonProduct.js'), Bot = require('./Bot.js'), readWrite = require('fs')
const { listProductsOnShopify } = require('./Shopify.js')
const Shopify = require('./Shopify.js')

class Amazon 
{
    static products = []
    static jsonProducts = []
    static productAsin = ""

    constructor(){}    

    static async scrapeAmazonItems(AmazonPage, Index)
    {   
        this.productAsin = ""
        try
        {
            await AmazonPage.bringToFront()
            await AmazonPage.goto("https://www.amazon.com/s?me=A35CSG8GBUTFQU&fbclid=IwAR0ydIgERsEWj1VgWBm09m8rme8dWxq5zrJ7ybRpkBwKQUrhTVfZdPccYPw&marketplaceID=ATVPDKIKX0DER#ace-9766277718", { waitUntil: 'networkidle2' })
            await this.getPassedBotCheck(AmazonPage)

            await AmazonPage.waitForTimeout(250)
            this.productAsin = this.jsonProducts[Index].asin1
            let alreadyAdded = await Bot.CheckIfItemHasBeenListed(AmazonPage, this.productAsin)

            if(alreadyAdded)
            {
                console.log(`${this.productAsin} has already been listed.`)
                throw "Item Already Listed"
            }

            await this.findProductByAsin(AmazonPage, this.productAsin)

            let newProduct = await this.scrapeProductPage(AmazonPage, this.productAsin)

            return newProduct
        }
        catch(exception)
        { 
            //we do not want to be notified every time it cannot find a product but we need it for error logging
            if(exception != "Could Not Find Product" && exception != "Item Already Listed")
            {
                await Bot.sendSlackMessage(`Broke during Amazon listing phase. Error: ${exception} Asin: ${this.productAsin}`)
            }            
            
            if(exception != "Item Already Listed") 
            {
                await Bot.LogProductError(AmazonPage, this.productAsin, exception)
            }

            //we need the exception to be thrown to the calling class also
            throw `${exception} ${exception.stack}`
        }
    }

    static async getNumberOfProductsToMigrate(AmazonPage)
    {
        this.jsonProducts = await this.getJsonProducts(AmazonPage)
        return this.jsonProducts.length
    }

    static async findProductByAsin(page, asin)
    {
        try
        {
            //we need to clear the text box first lol amazon
            await page.click('input[id="twotabsearchtextbox"]', {clickCount: 4})
            await page.type('input[id="twotabsearchtextbox"]', `${asin}`)
            await page.click('span[id="nav-search-submit-text"]')
            await page.waitForSelector('span[class="a-size-medium a-color-base a-text-normal"]', { timeout: 1000 })
            await page.waitForTimeout(250)
            await page.click('span[class="a-size-medium a-color-base a-text-normal"]')
        }
        catch(Exception)
        {
            throw "Could Not Find Product " + Exception.stack
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
            await Bot.sendSlackMessage("Human intervention needed, stuck at Bot Check")
            //Gives us an hour to get the bot passed the check
            await page.waitForSelector('input[id="twotabsearchtextbox"]', {timeout: 60000 * 60})
        }
    }

    static async scrapeProductPage(page, asin)
    {
        let title = await this.scrapeAmazonTitle(page)
        let imageUrls = await this.scrapeAmazonImages(page)
        let descriptions = await this.scrapeAmazonDescription(page)
        let UPC = await this.scrapeAmazonUPC(page)
        let price = await this.scrapeAmazonPrice(page)
        let brand = await this.scrapeAmazonBrand(page)
        let ingredients = await this.scrapeAmazonIngredients(page)
        
        console.log(`${title}, \n${imageUrls}, \n${descriptions}, \n${UPC}, \n${price}, \n${brand}, \ningredients: ${ingredients},\nasin: ${asin}`)

        await page.waitForTimeout(250)

        return new Product(asin, title, imageUrls, descriptions, UPC, price, brand, ingredients)
    }

    static async scrapeAmazonBrand(page)
    {    
        try
        {
            let brandElement = await page.$('a[id="bylineInfo"]')
            let brand = await page.evaluate(el => el.textContent, brandElement)

            return brand.replace("Visit the ", "").replace(" Store", "").replace("Brand: ", "")
        }
        catch(Exception)
        {
            console.log(Exception.stack)
            throw "Error ecountered while scraping Brand"
        }
    }

    static async scrapeAmazonPrice(page)
    {    
        try
        {
            let priceElement = await page.$('span[id="priceblock_ourprice"]')
            let price = await page.evaluate(el => el.textContent, priceElement)
            return price.replace("$", "")
        }
        catch(Exception)
        {
            console.log(Exception.stack)
            throw "Error encountered while scraping the price"
        }
    }

    static async scrapeAmazonIngredients(page)
    {
        try
        {
            let elements = await page.$$('div[id="important-information"] div')
            await page.waitForTimeout(500)

            let ingredients = ""

            for(let counter = 0; counter < elements.length; counter++)
            {
                let informationElement = await elements[counter].$('h4')
                let information;

                try{ information = await page.evaluate(info => info.textContent, informationElement) }
                catch(Exception) { continue }

                if(information == "Ingredients")
                {
                    let ingredientElement = await elements[counter].$$('p')
                    ingredients = await page.evaluate(el => el.textContent, ingredientElement[1])
                }
            }

            return ingredients
        }
        catch(Exception)
        {
            console.log(Exception.stack)
            throw "Exception encountered while scraping the ingredients"
        }
    }

    static async scrapeAmazonUPC(page)
    {
        try
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
        catch(Exception)
        {
            console.log(Exception.stack)
            throw "Error encountered while scraping UPC"
        }
    }

    static async scrapeAmazonDescription(page)
    {
        try
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
        catch(Exception)
        { 
            console.log(Exception.stack)
            throw "Error encountered while scraping the description"
        }
    }

    static async scrapeAmazonImages(page)
    {
        let imageUrls = []

        try
        {
            page.waitForTimeout(500)
            await page.waitForSelector('li[class="a-spacing-small item imageThumbnail a-declarative"]')
            let pictureElements = await page.$$('li[class="a-spacing-small item imageThumbnail a-declarative"]')

            for(let counter = 0; counter < pictureElements.length; counter++)
            {
                page.waitForTimeout(500)
                await pictureElements[counter].click()
                let image = await page.$$('div[class="imgTagWrapper"] img')
                let imageUrl = await page.evaluate(el => el.src, image[counter])
                
                imageUrls.push(imageUrl)

                //we need to watch out for base64 images and log them
                if(imageUrl.indexOf('base64') != -1)
                { 
                    throw "Found Base64 Encoded Image"
                }
            }
        }
        catch(Exception)
        {
            console.log(Exception.stack)
            throw `Error encountered while scraping images ${Exception}`
        }

        return imageUrls
    }

    static async scrapeAmazonTitle(page)
    {
        try
        {
            await page.waitForSelector('span[id="productTitle"]')
            let titleElement = await page.$('span[id="productTitle"]')
            let title = await page.evaluate(el => el.textContent, titleElement)

            return title.trim()
        }
        catch(Exception)
        {
            console.log(Exception.stack)
            throw "Error encountered while scraping the Title"
        }
    }
}

module.exports = Amazon
