import { fromBuffer } from "pdf2pic";

import * as ImageOptions from "./image_options.js"

export async function generateThumbnail(pdfBuffer, widthInch, heightInch)
{
    console.log('generating base64Thumbnail...')

    let storeAsImage = fromBuffer(pdfBuffer, ImageOptions.getThumbnailOptions(widthInch, heightInch));
    return await storeAsImage(1, true); 
}

export async function generateSmallImage(pdfBuffer, widthInch, heightInch)
{
    console.log('generating base64Small...')

    let storeAsImage = fromBuffer(pdfBuffer, ImageOptions.getSmallImageOptions(widthInch, heightInch));
    return await storeAsImage(1, true); 
}

export async function generateLargeImage(pdfBuffer, widthInch, heightInch)
{
    console.log('generating base64Large...')

    let storeAsImage = fromBuffer(pdfBuffer, ImageOptions.getLargeImageOptions(widthInch, heightInch));
    return await storeAsImage(1, true); 
}

export async function generateXLargeImage(pdfBuffer, widthInch, heightInch)
{
    console.log('generating base64XLarge...')

    let storeAsImage = fromBuffer(pdfBuffer, ImageOptions.getXLargeImageOptions(widthInch, heightInch));
    return await storeAsImage(1, true); 
}