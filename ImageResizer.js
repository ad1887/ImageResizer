// import dependencies from node_modules
const SDK = require("aws-sdk");
const SHARP = require("sharp");

// instantiate S3 helper
const S3 = new SDK.S3();
const MEDIUM_IMG_BUCKET = process.env.MEDIUM_IMG_BUCKET;
const THUMB_IMG_BUCKET = process.env.THUMB_IMG_BUCKET;
const MEDIUM_IMG_WIDTH = parseInt(process.env.MEDIUM_IMG_WIDTH, 10);
const MEDIUM_IMG_HEIGHT = parseInt(process.env.MEDIUM_IMG_HEIGHT, 10);
const THUMB_IMG_WIDTH = parseInt(process.env.THUMB_IMG_WIDTH, 10);
const THUMB_IMG_HEIGHT = parseInt(process.env.THUMB_IMG_HEIGHT, 10);
// export handler function that is needed for lambda execution
exports.handler = async function (event, context, callback) {
  try {
    const sourceBucket = event.Records[0].s3.bucket.name;
    let fileName = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
    // fetch the original image from S3
    let imageData = await S3.getObject({ Bucket: sourceBucket, Key: fileName }).promise();
    if(imageData && imageData.Body) {
      let uploadMedImg, uploadThumbImg;
      let mediumImgBufferData = await SHARP(imageData.Body)
          .resize(MEDIUM_IMG_WIDTH, MEDIUM_IMG_HEIGHT)
          // .toFormat("png")
          .toBuffer();
      let thumbImgBufferData = await SHARP(imageData.Body)
          .resize(THUMB_IMG_WIDTH, THUMB_IMG_HEIGHT)
          // .toFormat("png")
          .toBuffer();
      if(!mediumImgBufferData || !thumbImgBufferData) {
        throw new Error("missing image data");
      }
      // upload medium image to S3
      uploadMedImg = await uploadImage(mediumImgBufferData, MEDIUM_IMG_BUCKET, fileName);
      console.log('medium image response:', uploadMedImg);
      // upload thumb image to S3
      uploadThumbImg = await uploadImage(thumbImgBufferData, THUMB_IMG_BUCKET, fileName);
      console.log('thumb image response:', uploadThumbImg);

      if(!uploadMedImg || !uploadThumbImg) {
        throw new Error("image upload error");
      }
      callback(null, "images resized successfully");
    } else {
      throw new Error("image not found");
    }
  } catch(e) {
    console.log(e.message);
    callback(e.message);
  }
};

async function uploadImage(buffer, bucketName, key) {
  let fileExt = key.split('.').pop();
  let contentType = fileExt.toLowerCase().slice(1) === "png" ? "image/png" : "image/jpeg";
  return new Promise(function(resolve, reject) {
    try {
      let params = {
        Body: buffer,
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
      };
      S3.putObject(params,
        function(err, response) {
          if(err) {
            console.log(err, err.stack);
            reject(err.message);
          } 
          console.log({'response':response, 'imageName:': key});
          resolve({'response':response, 'imageName:': key});
        }
      );
    } catch(e) {
      console.log(e.message);
      reject(e.message);
    }
  });
}
