import got from 'got';
import tunnel from 'tunnel';
import sleep from "../utility/sleep.js"

const proxyAgent = tunnel.httpsOverHttp({
    proxy: {
      host: "http://67.43.227.227",
      port: 7415,
    }
  });

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
            const response = await got.post(endpoint, 
            { 
                json: payload,
            agent: {
                https: proxyAgent,
            } });
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