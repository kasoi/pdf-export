import got from 'got';

export async function downloadPdf(pdfUrl)
{
    try
    {
        return await got(pdfUrl).buffer();
    }
    catch(err)
    {
        throw new Error(`failed to download pdf [${pdfUrl}], reason: ${err}`)
    }
}