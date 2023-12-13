export const getThumbnailOptions = (width, height) => 
{
    const ratio = width / height;
    const maxSize = 400;
    const dpi = maxSize / height;
    return getImageOptions(maxSize * ratio , maxSize, dpi, 90);
};
  
export const getSmallImageOptions = (width, height) => 
{
    const ratio = width / height;
    const maxSize = 800;
    const dpi = maxSize / width;
    return getImageOptions(maxSize, maxSize / ratio, dpi, 98);
};

export const getLargeImageOptions = (width, height) => 
{
    const ratio = width / height;
    const maxSize = 2160;
    const dpi = maxSize / width;

    if (width > height)
        return getImageOptions(maxSize, maxSize / ratio, dpi);
    else
        return getImageOptions(maxSize * ratio, maxSize, dpi);
};

export const getXLargeImageOptions = (width, height) => 
{
    const ratio = width / height;
    const maxSize = 2700;
    const dpi = maxSize / width;

    if (width > height)
        return getImageOptions(maxSize, maxSize / ratio, dpi);
    else
        return getImageOptions(maxSize * ratio, maxSize, dpi);
};

export const getImageOptions = (width, heigth, dpi, quality = 95) => 
{
    const options = 
    {
        width: Math.round(width),
        height: Math.round(heigth),
        density: Math.round(dpi) * 4,
        format: 'jpg',
        quality: quality
    };

    return options;
};