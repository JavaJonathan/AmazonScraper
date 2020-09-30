var fs = require('fs'), request = require('request'), puppeteer = require('puppeteer'), readWrite = require('fs');
const { Agent } = require('http');

//this allows us to go back to the page we loft off at when grsbbing item from Amazon
let urlLeftOff;
const addNewProductUrl = 'https://pbdcollectibles.myshopify.com/admin/products/new'
let products = []
let username;
let password;

startBot()

async function startBot()
{
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'], defaultViewport: null})
    const page = await browser.newPage()

    await grabBotConfigs(page)
    await scrapeAmazonItems(page)
    await listProductsOnShopify(page)
}

async function grabBotConfigs(page)
{
    let botConfigs

    readWrite.readFile('botConfigs.json', (error, configs) => 
    {
        if(error) throw error

        botConfigs = JSON.parse(configs)
    })

    await page.waitForTimeout(1000)

    username = botConfigs[0].username
    password = botConfigs[0].password
    urlLeftOff = botConfigs[0].urlLeftOff
}

async function listProductsOnShopify(page)
{
    await page.goto(addNewProductUrl, { waitUntil: 'networkidle2' })
    await logIn(page)
    await listItem(page)
}

async function listItem(page)
{
    await page.waitForSelector('input[name="title"]')
    await page.click('input[name="title"]')
    await page.type('input[name="title"]', `${products[0].Title}`)
    await page.click('button[aria-describedby="PolarisTooltipContent5"]')

    await page.click('iframe[title="Rich Text Area. Press ALT-F9 for menu. Press ALT-F10 for toolbar. Press ALT-0 for help"]')
    for(let counter = 0; counter < products[0].Descriptions.length; counter++)
    {
        await page.type('iframe[title="Rich Text Area. Press ALT-F9 for menu. Press ALT-F10 for toolbar. Press ALT-0 for help"]', `${products[0].Descriptions[counter]}`)
        await page.keyboard.press('Enter'); 
    }

    await page.keyboard.press('Backspace'); 

    // await page.click('span[class="Polaris-Button__Text_yj3uv"]')

    await page.type('input[name="price"]', `${products[0].Price}`) 
    await page.waitForTimeout(250)

    let checkBoxElements = await page.$$('span[class="Polaris-Checkbox__Backdrop_1x2i2"]')
    await checkBoxElements[2].click()
    await page.waitForTimeout(250)

    await page.click('input[id="AdjustQuantityPopoverTextFieldActivator"]')
    await page.keyboard.press('Delete'); 
    await page.type('input[id="AdjustQuantityPopoverTextFieldActivator"]', '5')
    await page.waitForTimeout(250)

    await page.type('input[id="PolarisTextField7"]', `${products[0].Brand}`)
}

async function logIn(page)
{
    await page.type('input[id="account_email"]', `${username}`, {delay: 25})
    await page.waitForTimeout(2000)
    await page.click('button[name="commit"]')
    await page.waitForSelector('input[id="account_password"]')
    await page.type('input[id="account_password"]', `${password}`, {delay: 25})
    await page.waitForTimeout(2000)
    await page.click('button[name="commit"]')
}

async function scrapeAmazonItems(page)
{
    await page.goto(urlLeftOff, { waitUntil: 'networkidle2' })
    
    //we do not know when the loop needs to end until we hit an element without an asin element
    // for(let counter = 0; ; counter++)
    // {
        
    // }

    //we need this because a tiny modal appears
    await page.click('a[class="a-link-normal a-text-normal"]')[0]
    page.waitForTimeout(500)
    await page.click('a[class="a-link-normal a-text-normal"]')[0]
    
    let newProduct = await scrapeProductPage(page)
    products.push(newProduct)
}

async function scrapeProductPage(page)
{
    let title = await scrapeAmazonTitle(page)
    let imageUrls = await scrapeAmazonImages(page)
    let descriptions = await scrapeAmazonDescription(page)
    let UPC = await scrapeAmazonUPC(page)
    let price = await scrapeAmazonPrice(page)
    let brand = await scrapeAmazonBrand(page)
    
    console.log(title, imageUrls, descriptions, UPC, price, brand)

    return new Product(title, imageUrls, descriptions, UPC, price, brand)
}

async function scrapeAmazonTitle(page)
{
    await page.waitForSelector('span[id="productTitle"]')
    let titleElement = await page.$('span[id="productTitle"]')
    let title = await page.evaluate(el => el.textContent, titleElement)

    return title.trim()
}

async function scrapeAmazonImages(page)
{
    await page.waitForSelector('li[class="a-spacing-small item imageThumbnail a-declarative"]')
    let pictureElements = await page.$$('li[class="a-spacing-small item imageThumbnail a-declarative"]')

    let imageUrls = []

    for(let counter = 0; counter < pictureElements.length; counter++)
    {
        await pictureElements[counter].click()
        page.waitForTimeout(500)
        let image = await page.$('img[id="landingImage"]')
        let imageUrl = await page.evaluate(el => el.src, image)
        
        imageUrls.push(imageUrl)
    }

    return imageUrls
}

async function scrapeAmazonDescription(page)
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

async function scrapeAmazonUPC(page)
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

async function scrapeAmazonPrice(page)
{    
    let priceElement = await page.$('span[id="priceblock_ourprice"]')
    let price = await page.evaluate(el => el.textContent, priceElement)
    return price
}

async function scrapeAmazonBrand(page)
{    
    let brandElement = await page.$('a[id="bylineInfo"]')
    let brand = await page.evaluate(el => el.textContent, brandElement)

    return brand.replace("Visit the ", "").replace("Store", "")
}

class Product
{
    Title;
    ImageLinks = []
    Descriptions = []
    UPC;
    Price;
    Brand;
    constructor(title, imageLinks, descriptions, upc, price, brand)
    {
        this.Title = title
        this.ImageLinks = imageLinks
        this.Descriptions = descriptions
        this.UPC = upc
        this.Price = price
        this.Brand = brand
    }    
}

//We have this download functionality for just in case
// function download(uri, filename, callback) 
// {
//   request.head(uri, function(err, res, body){
//     console.log('content-type:', res.headers['content-type']);
//     console.log('content-length:', res.headers['content-length']);

//     request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
//   });
// };

// download('https://images-na.ssl-images-amazon.com/images/I/61ETmnP83rL._AC_SL1500_.jpg', 'google.png', function(){
//   console.log('done');
// });