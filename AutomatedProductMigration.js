const { count } = require('console'), Bot = require('./Bot.js'), { Agent } = require('http'), Shopify = require('./Shopify.js'), puppeteer = require('puppeteer'), Amazon = require('./Amazon.js');

start()

async function start()
{
    const browser = await puppeteer.launch({ headless: false, args: ['--start-maximized'], defaultViewport: null})
    const ShopifyPage = await browser.newPage()

    await Bot.grabBotConfigs(ShopifyPage)
    //await Shopify.logInToShopify(ShopifyPage)

    const AmazonPage = await browser.newPage()

    let numberOfProducts = await Amazon.getNumberOfProductsToMigrate(AmazonPage)
    for(let counter = 0; counter < numberOfProducts; counter++)
    {
        try
        {
            let newProduct = await Amazon.scrapeAmazonItems(AmazonPage, counter)
            //await Shopify.listProductOnShopify(ShopifyPage, newProduct)
            await AmazonPage.waitForTimeout(30000)
        }
        catch(exception)
        {
            //do nothing because we handle everything earlier, we just need what is inside of this try block to be treated as transactional
            //essentially is a psuedo transactional implmentation
        }
    }
    await Bot.sendSlackMessage()
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