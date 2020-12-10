//ORB特有
cv.ORB();
cv.KeyPointVector();
cv.DMatchVector();
cv.BFMatcher(cv.NORM_HAMMING, false);
cv.DMatchVectorVector();


//光流特有
cv.Size(15, 15);
cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.01);
cv.Mat.zeros(frame.height, frame.width, cv.CV_8UC1);
cv.matFromArray();
cv.fillConvexPoly(mask_track, square_points, new cv.Scalar(255));
cv.goodFeaturesToTrack(currentGray, p0, maxCorners, qualityLevel, minDistance, mask_track, blockSize);
cv.calcOpticalFlowPyrLK();



//通用
cv.Scalar();
cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY);
cv.findHomography(matched1, matched2, cv.RANSAC, RANSAC_THRESH, inlierMask);
cv.perspectiveTransform();
cv.circle();


//卡尔曼滤波
cv.setIdentity();
cv.KalmanFilter(nStates, nMeasurements, nInputs, cv.CV_64F);


//KCF唐集成
cv.Rect();
cv.TrackerKCF();
