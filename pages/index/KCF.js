//ORB特有
cv.ORB();
cv.KeyPointVector();
cv.DMatchVector();
cv.BFMatcher(cv.NORM_HAMMING, false);
cv.DMatchVectorVector();



//通用
cv.Scalar();
cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY);
cv.findHomography(matched1, matched2, cv.RANSAC, RANSAC_THRESH, inlierMask);
cv.perspectiveTransform();
cv.circle();



//卡尔曼滤波
cv.setIdentity();
cv.KalmanFilter(nStates, nMeasurements, nInputs, cv.CV_64F);


//KCF集成