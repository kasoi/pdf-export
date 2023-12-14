import 'dotenv/config';
import { readdir } from 'fs/promises';
import fs from "fs";

import { processSubmissionBody } from './process.js';

export async function processCacheLoop() 
{
    try 
    {  
        const folder = process.env.SUBMISSIONS_CACHE_FOLDER;
    
        if (!fs.existsSync(folder)) 
        {
            fs.mkdirSync(folder);
        }
    
        const files = await readdir(folder);
    
        for (const file of files)
        {
            if (file && file.match(/^(\d+)\.json$/g)) 
            {
                console.log(`processing file ${file}...`);
                const json = JSON.parse(fs.readFileSync(folder + file));
                await processSubmissionBody(json);
            }
        }

        setTimeout(processCacheLoop, 5000);
    } 
    catch (err) {
      console.log(`ERR: processCacheLoop, exception = ${err}`);
    }
}