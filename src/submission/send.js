import got from 'got';
import sleep from "../utility/sleep.js"
import tunnel from 'tunnel'

const agent = tunnel.httpsOverHttp({
    proxy: {
        host: process.env.PROXY_IP,
        port: parseInt(process.env.PROXY_PORT),
        proxyAuth: process.env.PROXY_AUTH
    },
});

export async function sendDataToFTP(endpoint, payload)
{
    let timeout = process.env.SEND_TO_FTP_TIMEOUT_MS;
    let started = new Date().getTime();

    const options = { json: payload };

    if(process.env.ACTIVE 
    && parseInt(process.env.ACTIVE) === 1 
    && process.env.PROXY_IP 
    && process.env.PROXY_PORT 
    && process.env.PROXY_AUTH) {
        options.agent = { https: agent };
    }

    console.log(`submit to ftp loop`);

    while (((new Date().getTime() - started) < timeout))
    {
        console.log(`sending to ${endpoint} (now = ${new Date().getTime()}, started = ${started})`);

        try
        {
            const response = await got.post(endpoint, options);
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