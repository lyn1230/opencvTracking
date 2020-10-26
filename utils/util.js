let showToast = function (description, duration = 1500, icon = 'success') {
  wx.showToast({
    title: description,
    duration: duration,
    icon: icon
  })
};

let initOriginalFrameInfo = function (originalFrameArray, originalKeyPointsArray, originalDescriptorsArray, imageArray, width, height, cv, detector) {
  let originalFrame1 = new cv.Mat(height, width, cv.CV_8UC4);
  let originalFrame2 = new cv.Mat(height, width, cv.CV_8UC4);
  let originalFrame3 = new cv.Mat(height, width, cv.CV_8UC4);
  let originalFrame4 = new cv.Mat(height, width, cv.CV_8UC4);

  let originalKeyPoints1 = new cv.KeyPointVector();
  let originalKeyPoints2 = new cv.KeyPointVector();
  let originalKeyPoints3 = new cv.KeyPointVector();
  let originalKeyPoints4 = new cv.KeyPointVector();

  let originalDescriptors1 = new cv.Mat();
  let originalDescriptors2 = new cv.Mat();
  let originalDescriptors3 = new cv.Mat();
  let originalDescriptors4 = new cv.Mat();


  cv.imread(imageArray[0], function (mat) {
    originalFrame1 = mat;
    let originalGray = new cv.Mat();    
    cv.cvtColor(originalFrame1, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints1);
    console.log(originalKeyPoints1);
    detector.compute(originalGray, originalKeyPoints1, originalDescriptors1);
  });

  cv.imread(imageArray[1], function (mat) {
    originalFrame2 = mat;
    let originalGray = new cv.Mat();
    cv.cvtColor(originalFrame2, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints2);
    detector.compute(originalGray, originalKeyPoints2, originalDescriptors2);
  });

  cv.imread(imageArray[2], function (mat) {
    originalFrame3 = mat;
    let originalGray = new cv.Mat();
    cv.cvtColor(originalFrame3, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints3);
    detector.compute(originalGray, originalKeyPoints3, originalDescriptors3);
  });

  cv.imread(imageArray[3], function (mat) {
    originalFrame4 = mat;
    let originalGray = new cv.Mat();
    cv.cvtColor(originalFrame4, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints4);
    detector.compute(originalGray, originalKeyPoints4, originalDescriptors4);
  });



  originalFrameArray[0] = originalFrame1;
  originalFrameArray[1] = originalFrame2;
  originalFrameArray[2] = originalFrame3;
  originalFrameArray[3] = originalFrame4;

  originalKeyPointsArray[0] = originalKeyPoints1;
  originalKeyPointsArray[1] = originalKeyPoints2;
  originalKeyPointsArray[2] = originalKeyPoints3;
  originalKeyPointsArray[3] = originalKeyPoints4;

  originalDescriptorsArray[0] = originalDescriptors1;
  originalDescriptorsArray[1] = originalDescriptors2;
  originalDescriptorsArray[2] = originalDescriptors3;
  originalDescriptorsArray[3] = originalDescriptors4;
};


module.exports = {
  alert: showToast,
  init_originalFrameInfo: initOriginalFrameInfo
};