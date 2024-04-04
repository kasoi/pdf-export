export function getRawRequestField(rawRequest, propName, required, defaultValue = '') 
{
    for (const property in rawRequest) 
    {
      const pattern = new RegExp("^q\\d+_" + propName + "$");
  
      if (property.match(pattern)) 
      {
        if (rawRequest[property]) 
        {
          return rawRequest[property];
        } 
        else 
        {
          if (required && !defaultValue) 
          {
            throw new Error(`rawRequest property [${propName}] is required and empty`);
          }

          return defaultValue;
        }
      }
    }
  
    if (required && !defaultValue) 
    {
      throw new Error(`rawRequest has no property [${propName}]`);
    }
  
    return defaultValue;
}
  
export function getPosterURL(endpoint, folder, useGroupName, eventid, posterid) 
{
    let posterUrl = endpoint.replace('submit.php', '') + `${folder}/`;
  
    if (useGroupName) 
    {
      posterUrl += `${eventid}/`;
    }
  
    posterUrl += `${posterid}/`;
  
    return posterUrl;
  }
  
export function getVideoIDFromLink(link) 
{
    const regexp = new RegExp(/(?:https*\:\/\/)*(?:www\.)*(?:youtu\.be\/|youtube\.com\/watch\?v\=)([^&]+)/g);
    const matches = regexp.exec(link);
  
    if(matches && matches.length > 0) 
    {
      return matches[1];
    }
  
    return "";
}