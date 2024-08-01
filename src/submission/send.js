import got from 'got';
import sleep from "../utility/sleep.js"

export async function sendDataToFTP(endpoint, payload)
{
    let timeout = process.env.SEND_TO_FTP_TIMEOUT_MS;
    let started = new Date().getTime();

    console.log(`submit to ftp loop`);

    while (((new Date().getTime() - started) < timeout))
    {
        console.log(`sending to ${endpoint} (now = ${new Date().getTime()}, started = ${started})`);

        try
        {
            const response = await got.post(endpoint, { json: payload });
            console.log(response.body);
    
            if (response?.body === 'ok') 
            {
                console.log('sent to ftp');
                return true;
            }

            console.log(`failed to send to ftp, error: ${response?.body}`)
        }
        catch(error)
        {
            console.log(`failed to send to ftp, error: ${error}`);
        }

        await sleep(2000);
    }

    console.log(`timed out sending to ftp`);
    return false;
}