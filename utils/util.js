require("./posit1_patched.js");
let showToast = function (description, duration = 1500, icon = 'success') {
  wx.showToast({
    title: description,
    duration: duration,
    icon: icon
  })
};

let initOriginalFrameInfo = async function (originalFrameArray, originalKeyPointsArray, originalDescriptorsArray, imageArray, width, height, cv, detector) {
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

  await cv.imread(imageArray[0]).then((mat) => {
    originalFrame1 = mat;
    let originalGray = new cv.Mat();
    cv.cvtColor(originalFrame1, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints1);
    detector.compute(originalGray, originalKeyPoints1, originalDescriptors1);
  });

  await cv.imread(imageArray[1]).then((mat) => {
    originalFrame2 = mat;
    let originalGray = new cv.Mat();
    cv.cvtColor(originalFrame2, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints2);
    detector.compute(originalGray, originalKeyPoints2, originalDescriptors2);
  });


  await cv.imread(imageArray[2]).then((mat) => {
    originalFrame3 = mat;
    let originalGray = new cv.Mat();
    cv.cvtColor(originalFrame3, originalGray, cv.COLOR_RGB2GRAY); // 进行灰度化  
    detector.detect(originalGray, originalKeyPoints3);
    detector.compute(originalGray, originalKeyPoints3, originalDescriptors3);
  });


  await cv.imread(imageArray[3]).then((mat) => {
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

  console.log(originalDescriptorsArray[3]);
  console.log("模板图描述子提取结束...");
};

let initOriginalBB = function (vertexArray, cv) {
  let originalBB0 = new cv.Mat(4, 1, cv.CV_32FC2);
  originalBB0.data32F[0] = 0;
  originalBB0.data32F[1] = 0;
  originalBB0.data32F[2] = 250;
  originalBB0.data32F[3] = 0;
  originalBB0.data32F[4] = 250;
  originalBB0.data32F[5] = 250;
  originalBB0.data32F[6] = 0;
  originalBB0.data32F[7] = 250;

  let originalBB1 = new cv.Mat(4, 1, cv.CV_32FC2);
  originalBB1.data32F[0] = 0;
  originalBB1.data32F[1] = 0;
  originalBB1.data32F[2] = 200;
  originalBB1.data32F[3] = 0;
  originalBB1.data32F[4] = 200;
  originalBB1.data32F[5] = 200;
  originalBB1.data32F[6] = 0;
  originalBB1.data32F[7] = 200;

  let originalBB2 = new cv.Mat(4, 1, cv.CV_32FC2);
  originalBB2.data32F[0] = 0;
  originalBB2.data32F[1] = 0;
  originalBB2.data32F[2] = 170;
  originalBB2.data32F[3] = 0;
  originalBB2.data32F[4] = 170;
  originalBB2.data32F[5] = 170;
  originalBB2.data32F[6] = 0;
  originalBB2.data32F[7] = 170;

  let originalBB3 = new cv.Mat(4, 1, cv.CV_32FC2);
  originalBB3.data32F[0] = 0;
  originalBB3.data32F[1] = 0;
  originalBB3.data32F[2] = 170;
  originalBB3.data32F[3] = 0;
  originalBB3.data32F[4] = 170;
  originalBB3.data32F[5] = 170;
  originalBB3.data32F[6] = 0;
  originalBB3.data32F[7] = 170;

  vertexArray[0] = originalBB0;
  vertexArray[1] = originalBB1;
  vertexArray[2] = originalBB2;
  vertexArray[3] = originalBB3;
};

// 画出识别图四周框
let drawBoundingBox = function (img, bb, cv) {
  cv.line(
    img, {
      x: bb.data32F[0],
      y: bb.data32F[1]
    }, {
      x: bb.data32F[2],
      y: bb.data32F[3]
    },
    [255, 0, 0, 255],
    3);
  cv.line(
    img, {
      x: bb.data32F[2],
      y: bb.data32F[3]
    }, {
      x: bb.data32F[4],
      y: bb.data32F[5]
    },
    [255, 0, 0, 255],
    3);
  cv.line(
    img, {
      x: bb.data32F[4],
      y: bb.data32F[5]
    }, {
      x: bb.data32F[6],
      y: bb.data32F[7]
    },
    [255, 0, 0, 255],
    3);
  cv.line(
    img, {
      x: bb.data32F[6],
      y: bb.data32F[7]
    }, {
      x: bb.data32F[0],
      y: bb.data32F[1]
    },
    [255, 0, 0, 255],
    3);
};

let judgeRectangle = function (newBB) {
  let a, b, c, d = 0
  a = Math.sqrt((newBB.data32F[0] - newBB.data32F[2]) * (newBB.data32F[0] - newBB.data32F[2]) + (newBB.data32F[1] - newBB.data32F[3]) * (newBB.data32F[1] - newBB.data32F[3]));
  b = Math.sqrt((newBB.data32F[2] - newBB.data32F[4]) * (newBB.data32F[2] - newBB.data32F[4]) + (newBB.data32F[3] - newBB.data32F[5]) * (newBB.data32F[3] - newBB.data32F[5]));
  c = Math.sqrt((newBB.data32F[4] - newBB.data32F[6]) * (newBB.data32F[4] - newBB.data32F[6]) + (newBB.data32F[5] - newBB.data32F[7]) * (newBB.data32F[5] - newBB.data32F[7]));
  d = Math.sqrt((newBB.data32F[6] - newBB.data32F[0]) * (newBB.data32F[6] - newBB.data32F[0]) + (newBB.data32F[7] - newBB.data32F[1]) * (newBB.data32F[7] - newBB.data32F[1]));
  if (a / c > 1.1 || c / a > 1.1 || b / d > 1.1 || d / b > 1.1) {
    return 0;
  } else {
    return 1;
  }
}

let init_kalmanFilter = function (KF, nStates, nMeasurements, nInputs, dt, cv) {
  /* cv.setIdentity(KF.processNoiseCov, cv.Scalar.all(1e-5));       // set process noise
             cv.setIdentity(KF.measurementNoiseCov, cv.Scalar.all(1e-2));   // set measurement noise
             cv.setIdentity(KF.errorCovPost, cv.Scalar.all(1));             // error covariance*/

  cv.setIdentity(KF.processNoiseCov, cv.Scalar.all(1e-3)); // set process noise
  cv.setIdentity(KF.measurementNoiseCov, cv.Scalar.all(1e-2)); // set measurement noise
  cv.setIdentity(KF.errorCovPost, cv.Scalar.all(1)); // error covariance

  /** DYNAMIC MODEL **/
  //  [1 0 0 dt  0  0 dt2   0   0 0 0 0  0  0  0   0   0   0]
  //  [0 1 0  0 dt  0   0 dt2   0 0 0 0  0  0  0   0   0   0]
  //  [0 0 1  0  0 dt   0   0 dt2 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  1  0  0  dt   0   0 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  0  1  0   0  dt   0 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  0  0  1   0   0  dt 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  0  0  0   1   0   0 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  0  0  0   0   1   0 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  0  0  0   0   0   1 0 0 0  0  0  0   0   0   0]
  //  [0 0 0  0  0  0   0   0   0 1 0 0 dt  0  0 dt2   0   0]
  //  [0 0 0  0  0  0   0   0   0 0 1 0  0 dt  0   0 dt2   0]
  //  [0 0 0  0  0  0   0   0   0 0 0 1  0  0 dt   0   0 dt2]
  //  [0 0 0  0  0  0   0   0   0 0 0 0  1  0  0  dt   0   0]
  //  [0 0 0  0  0  0   0   0   0 0 0 0  0  1  0   0  dt   0]
  //  [0 0 0  0  0  0   0   0   0 0 0 0  0  0  1   0   0  dt]
  //  [0 0 0  0  0  0   0   0   0 0 0 0  0  0  0   1   0   0]
  //  [0 0 0  0  0  0   0   0   0 0 0 0  0  0  0   0   1   0]
  //  [0 0 0  0  0  0   0   0   0 0 0 0  0  0  0   0   0   1]

  // position
  KF.transitionMatrix.data64F[0 * nStates + 3] = dt;
  KF.transitionMatrix.data64F[1 * nStates + 4] = dt;
  KF.transitionMatrix.data64F[2 * nStates + 5] = dt;
  KF.transitionMatrix.data64F[3 * nStates + 6] = dt;
  KF.transitionMatrix.data64F[4 * nStates + 7] = dt;
  KF.transitionMatrix.data64F[5 * nStates + 8] = dt;
  KF.transitionMatrix.data64F[0 * nStates + 6] = 0.5 * Math.pow(dt, 2);
  KF.transitionMatrix.data64F[1 * nStates + 7] = 0.5 * Math.pow(dt, 2);
  KF.transitionMatrix.data64F[2 * nStates + 8] = 0.5 * Math.pow(dt, 2);

  // orientation
  KF.transitionMatrix.data64F[9 * nStates + 12] = dt;
  KF.transitionMatrix.data64F[10 * nStates + 13] = dt;
  KF.transitionMatrix.data64F[11 * nStates + 14] = dt;
  KF.transitionMatrix.data64F[12 * nStates + 15] = dt;
  KF.transitionMatrix.data64F[13 * nStates + 16] = dt;
  KF.transitionMatrix.data64F[14 * nStates + 17] = dt;
  KF.transitionMatrix.data64F[9 * nStates + 15] = 0.5 * Math.pow(dt, 2);
  KF.transitionMatrix.data64F[10 * nStates + 16] = 0.5 * Math.pow(dt, 2);
  KF.transitionMatrix.data64F[11 * nStates + 17] = 0.5 * Math.pow(dt, 2);


  /** MEASUREMENT MODEL **/
  //  [1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]
  //  [0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]
  //  [0 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0]
  //  [0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0 0]
  //  [0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0 0]
  //  [0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 0]

  KF.measurementMatrix.data64F[0 * nStates + 0] = 1; // x
  KF.measurementMatrix.data64F[1 * nStates + 1] = 1; // y
  KF.measurementMatrix.data64F[2 * nStates + 2] = 1; // z
  KF.measurementMatrix.data64F[3 * nStates + 9] = 1; // roll
  KF.measurementMatrix.data64F[4 * nStates + 10] = 1; // pitch
  KF.measurementMatrix.data64F[5 * nStates + 11] = 1; // yaw
}

let pose_estimate = function(marker_corner, width, height) {
  let canvasElement_width = width;
  let canvasElement_height = height;

  // convert corners coordinate
  var corners = []; //marker_corner;

  for (var i = 0; i < marker_corner.length; ++i) {
      corners.push({
          x: (marker_corner[i].x - (canvasElement_width / 2)),
          y: (canvasElement_height / 2) - marker_corner[i].y
      })
  }

  // compute the pose from the canvas
  var posit = new POS.Posit(modelSize, canvasElement_width);
  var pose = posit.pose(corners);
  if (pose === null)    return;

  return {rotation1: pose.bestRotation,  translation: pose.bestTranslation, rotation2: pose.alternativeRotation, error1:pose.bestError, error2:pose.alternativeError};
}

let rot_toeuler = function(rotation) {
  var thetaX;
  var thetaY;
  var thetaZ;

  thetaX = -Math.atan2(rotation[2][1], rotation[2][2]);
  thetaY = Math.atan2(rotation[2][0], Math.sqrt(rotation[2][1] * rotation[2][1] + rotation[2][2] * rotation[2][2]));
  thetaZ = Math.atan2(rotation[1][0], rotation[0][0]);

  return {x: thetaX, y: thetaY, z: thetaZ};
}

module.exports = {
  alertMini: showToast,
  init_originalFrameInfo: initOriginalFrameInfo,
  init_originalBB: initOriginalBB,
  draw_bounding_box: drawBoundingBox,
  rectangle: judgeRectangle,
  initKalmanFilter: init_kalmanFilter,
  poseEstimate: pose_estimate,
  rot2euler: rot_toeuler
};