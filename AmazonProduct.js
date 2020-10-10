class AmazonProduct
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

module.exports = AmazonProduct