const { count } = require('console');
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

async function getPassedBotCheck(page)
{
    await page.waitForSelector('input[id="twotabsearchtextbox"]')
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
    await makeListingInactive(page)
    await addShopifyTitle(page)    
    await addShopifyDescription(page)
    await uploadImageUrls(page)

    await page.type('input[name="price"]', `${products[0].Price}`) 
    await page.waitForTimeout(250)

    await checkBackOrderCheckBox(page)
    await addShopifyQuantity(page)

    await page.type('input[id="PolarisTextField7"]', `${products[0].Brand}`)
}

async function makeListingInactive(page)
{
    await page.waitForSelector('span[class="Polaris-Button__Text_yj3uv"]')
    let buttonElements = await page.$$('span[class="Polaris-Button__Text_yj3uv"]')
    for (let counter = 0; counter < buttonElements.length; counter++)
    {
        let buttonText = await page.evaluate(el => el.textContent, buttonElements[counter])
        if(buttonText == "Manage")
        {
            await buttonElements[counter].click()
            break
        }
    }

    await page.waitForSelector('button[class="Polaris-Modal-CloseButton_bl13t"]')
    let storeCheckBoxElements = await page.$$('span[class="Polaris-Checkbox_1d6zr"]')
    for (let counter = 0; counter < storeCheckBoxElements.length; counter++)
    {
        await page.waitForTimeout(250)
        await storeCheckBoxElements[counter].click()
    }

    let closeModalElements = await page.$$('button[class="Polaris-Button_r99lw Polaris-Button--primary_7k9zs"]')
    for (let counter = 0; counter < closeModalElements.length; counter++)
    {
        let buttonText = await page.evaluate(el => el.textContent, closeModalElements[counter])
        if(buttonText == "Done")
        {
            await closeModalElements[counter].click()
            break
        }
    }
}

async function uploadImageUrls(page)
{
    for(let counter = 0; counter < products[0].ImageLinks.length; counter++)
    {
        await page.waitForTimeout(500)
        await page.waitForSelector('button[aria-controls="Polarispopover6"]')
        await page.click('button[aria-controls="Polarispopover6"]')
        let imageUrlElements = await page.$$('button[class="Polaris-ActionList__Item_yiyol"]')
        imageUrlElements[0].click()

        await page.waitForSelector('input[placeholder="https://"]')
        await page.type('input[placeholder="https://"]', `${products[0].ImageLinks[counter]}`)

        let buttonElements = await page.$$('div[class="Polaris-ButtonGroup__Item_yiyol"]')
        for (let counter = 0; counter < buttonElements.length; counter++)
        {
            let buttonText = await page.evaluate(el => el.textContent, buttonElements[counter])
            if(buttonText == "Add media")
            {
                await buttonElements[counter].click()
                break
            }
        }
    }
}

async function checkBackOrderCheckBox(page)
{
    await page.click('label[for="InventoryTrackingAllowOutOfStockPurchases"] span')
}

async function addShopifyTitle(page)
{
    await page.waitForSelector('input[name="title"]')
    await page.waitForTimeout(500)
    await page.click('input[name="title"]')
    await page.type('input[name="title"]', `${products[0].Title}`)
}

async function addShopifyQuantity(page)
{   
    await page.waitForTimeout(250)
    await page.click('input[id="AdjustQuantityPopoverTextFieldActivator"]')
    await page.keyboard.press('Delete'); 
    await page.type('input[id="AdjustQuantityPopoverTextFieldActivator"]', '5')
    await page.waitForTimeout(250)
}

async function addShopifyDescription(page)
{    
    await page.waitForSelector('button[aria-describedby="PolarisTooltipContent5"]')
    await page.click('button[aria-describedby="PolarisTooltipContent5"]')
    await page.click('div[id="product-description_iframecontainer"]')
    for(let counter = 0; counter < products[0].Descriptions.length; counter++)
    {
        await page.type('div[id="product-description_iframecontainer"]', `${products[0].Descriptions[counter]}`)
        await page.keyboard.press('Enter'); 
    }

    await page.keyboard.press('Backspace');
}

async function logIn(page)
{
    await page.type('input[id="account_email"]', `${username}`, {delay: 25})
    await page.waitForTimeout(3000)
    await page.click('button[name="commit"]')
    await page.waitForSelector('input[id="account_password"]')
    await page.type('input[id="account_password"]', `${password}`, {delay: 25})
    await page.waitForTimeout(3000)
    await page.click('button[name="commit"]')
}

async function scrapeAmazonItems(page)
{
    await page.goto(urlLeftOff, { waitUntil: 'networkidle2' })
    await getPassedBotCheck(page)
    
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
        let image = await page.$$('div[class="imgTagWrapper"] img')
        let imageUrl = await page.evaluate(el => el.src, image[counter])
        
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