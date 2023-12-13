import fs from "fs";
import 'dotenv/config';

export function saveSubmissionToCache(body)
{
    try 
    {
      const folder = process.env.SUBMISSIONS_CACHE_FOLDER;

      if (!fs.existsSync(folder)) fs.mkdirSync(folder);

      fs.writeFileSync(folder + `${body.submissionID}.json`, JSON.stringify(body));

      return true;
    } 
    catch (exception) 
    {
      const errMessage = `ERR: failed saving submission data to cache [id = ${body.submissionID}], exception = ${exception.message}`;
      console.log(errMessage);
    }

    return false;
  };

export function moveSubmissionToHistory(submissionid, eventid, posterid) 
{
    try 
    {
      const folder = process.env.SUBMISSIONS_HISTORY_FOLDER + eventid + '/';
  
      if (!fs.existsSync(folder)) 
      {
        fs.mkdirSync(folder, { recursive: true });
      }
  
      const originFilePath = process.env.SUBMISSIONS_CACHE_FOLDER + submissionid + '.json';
      const destinationFilePath = folder + posterid + '.json';
  
      if (!fs.existsSync(originFilePath)) 
      {
        console.log(`haven't found [${submissionid}.json] in submission-cache`);

        if (fs.existsSync(destinationFilePath)) 
        {
          console.log(`since [${posterid}.json] exists in submission-history the poster must have been already processed`);
        }

        return;
      }
  
      fs.renameSync(originFilePath, destinationFilePath);
      console.log(`moved submission [${posterid}] to history`);
    } 
    catch (exception) 
    {
      const errMessage = `ERR: failed to move submission json (submissionID = ${submissionid}, posterid = ${posterid}), exception = ${exception.message}`;
      console.log(errMessage);
    }
}