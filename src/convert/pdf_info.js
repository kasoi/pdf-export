import { PDFDocument } from 'pdf-lib';

export default async function getPDFSizeInInches(buffer)
{
    let pdfDoc;

    try
    {
        // Load a PDFDocument without updating its existing metadata
        pdfDoc = await PDFDocument.load(buffer, 
        {
            updateMetadata: false
        });
    }
    catch(err) 
    {
        throw new Error(`couldnt parse PDF file, reason ${err.message}`);
    }

    if (pdfDoc.getPageCount() < 0) throw new Error(`pdf file has no pages`);

    const page = pdfDoc.getPage(0);

    return  ({
        width : page.getWidth() / 72, // pdf width in inches
        height : page.getHeight() / 72 // page height in inches
    });
}