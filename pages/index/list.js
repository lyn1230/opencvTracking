cv.imshow();
cv.ORB();
cv.KeyPointVector();
cv.DMatchVector();
cv.BFMatcher(cv.NORM_HAMMING, false);
cv.DMatchVectorVector();
cv.Size(15, 15);
cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.01);
cv.Scalar();
cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY);
cv.findHomography(matched1, matched2, cv.RANSAC, RANSAC_THRESH, inlierMask);
cv.perspectiveTransform();
cv.Mat.zeros(frame.height, frame.width, cv.CV_8UC1);
cv.matFromArray();
cv.fillConvexPoly(mask_track, square_points, new cv.Scalar(255));
cv.goodFeaturesToTrack(currentGray, p0, maxCorners, qualityLevel, minDistance, mask_track, blockSize);
cv.circle();
cv.calcOpticalFlowPyrLK();


