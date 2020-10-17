class AmazonProduct
{
    Asin;
    Title;
    ImageLinks = []
    Descriptions = []
    UPC;
    Price;
    Brand;
    Ingredients;
    SKU;

    constructor(asin, title, imageLinks, descriptions, upc, price, brand, ingredients)
    {
        this.Asin = asin
        this.Title = title
        this.ImageLinks = imageLinks
        this.Descriptions = descriptions
        this.UPC = upc
        this.Price = price
        this.Brand = brand
        this.Ingredients = ingredients
    }    
}

module.exports = AmazonProduct