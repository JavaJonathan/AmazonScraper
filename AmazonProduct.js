class AmazonProduct
{
    Title;
    ImageLinks = []
    Descriptions = []
    UPC;
    Price;
    Brand;
    Ingredients;

    constructor(title, imageLinks, descriptions, upc, price, brand, ingredients)
    {
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