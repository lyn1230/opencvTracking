// const THREE = require("../../utils/three/three.weapp.min");
const wasm = require("../../utils/opencv");

const { fbxModelLoad} = require("../../utils/three/model");

const {
  alertMini,
  init_originalFrameInfo,
  init_originalBB,
  draw_bounding_box,
  rectangle,
  initKalmanFilter,
  poseEstimate,
  rot2euler,
  init_smoothBBArray,
  window_smooth,
  performance_monitoring,
  model_poseUpdate,
  model_poseUpdateKCF
} = require("../../utils/util");
var cv;
var listener;



const cameraConfig = {
  flag: true, //是否获取下一个实时帧 
  frame: { //实时帧数据
    data: null,
    width: 0,
    height: 0
  },
  newVertex: null,
  oldVertex: null,
  ifHasWidthAndHeight: false
};
const performMonitor = { //性能监视器
  fps: 0, //帧率
  frameCount: 0, //记录总共处理的帧数
  frameRecognizedCount: 0, //记录模板图被识别出来的帧数
  recogRate: 0
};
let camera, renderer, scene, model, startListen; //three.js相关的三大要素

const templateImage = {
  originalDescriptorsArray: new Array(),
  originalKeyPointsArray: new Array(),
  originalFrameArray: new Array(),
  imageTem: [
    "https://www.wechatvr.org/imageTemplate/template_1.jpg",
    "https://www.wechatvr.org/imageTemplate/template_0.jpg",
    "https://www.wechatvr.org/imageTemplate/template_2.jpg",
    "https://www.wechatvr.org/imageTemplate/template_3.jpg",
  ],
  imageSchool: [
    "https://www.wechatvr.org/imageTemplate/school_0.jpg",
    "https://www.wechatvr.org/imageTemplate/school_1.jpg",
    "https://www.wechatvr.org/imageTemplate/school_2.jpg",
    "https://www.wechatvr.org/imageTemplate/school_3.jpg",
  ],
  tempImage_id: -1,
  vertexArray: new Array()
};
let dev = {
  ifStartListen: true, //是否开启监听器
  image: templateImage.imageSchool, //模板图是校园卡还是原来庄哥的图
  frameCount: 10000, //识别几帧之后停止下一帧的获取
  ifRecognized: false, //是否识别出模板图，用来计算fps用的，防止没识别出来的循环得到较高的帧率从而影响fps的计算
  orb: 0, //使用了几次orb的方法（l-k几次跟丢）
  onlyDetect: false,    //是否只使用detect的方案
  ifOrbAndLK: false,    //是否采用orb+lk的方法
  ifOrbAndKCF: true,    //是否采用ORB+KCF的跟踪方法
};

const currentFrameSet = {
  currentFrame: null,
  currentGray: null,
  detector: null,
  feature_size: 100, //要跟踪的特征点的数量
  keyPoints: null, //特征点
  descriptors: null, //描述子
  goodMatches: null,
  matcher: null,
  KNN_Matches: null
};
const animationUrl = "https://weixin.wechatvr.org/animation/pig/fuzhu.fbx";
let initial_position = {
  x:0,
  y:0,
  width: 0,
  height: 0,
  findFlag: false
};


//不知道放在哪里的变量
const MatchRatio = 0.8; //应用比例测试
const Min_InlierRatio = 0.5;
const Min_InlierSize = 10;
const RANSAC_THRESH = 3;
const RANSAC_THRESH_high = 5;

let p0 = null; //ORB
let [maxCorners, qualityLevel, minDistance, blockSize] = [60, 0.3, 6, 5];
let homography = null;

//L-K相关：
let LK_pointOld = null;
let LK_pointOrigin = null;
let originLKPointSize = 0; // 特征匹配成功后lk光流所需追踪的特征点数量
let oldGray = null;
let flag_BB = 0;
let temp_4BBArray = [];
let smoothBBArray = new Array();

let LK_pointNew = null;
let st = null;
let err = null;

let winSize = null;
let maxLevel = 2; // maxLevel 为使用的图像金字塔层数
let criteria = null;


//kalaman滤波初始化
let nStates = 18; // the number of states
let nMeasurements = 6; // the number of measured states
let nInputs = 0; // the number of control actions
let dt = 0.125; // time between measurements (1/FPS)
let KF = null; // instantiate Kalman Filter


//绘制光流轨迹
let mask = null;

//姿态估计
let originalRotation;
const modelSize = 1;

//开启光流跟踪标志位
let flag_trackLK = 0;

//开启KCF跟踪标志位
let flag_trackKCF = 0;
let KCF = null;
let notFindKCF = 0;
let isinit = false;   //KCF滤波器是否已经初始化好
let box = null;

// 产生随机颜色值
let color = [];
//不知道放在哪里的变量




Page({
  data: {    
  },

  //生命周期函数--监听页面初次渲染完成
  onReady: async function () {
    this.frameSizeInit(); //自动适配实时帧的宽高
    this.getwasm(); //加载opencv.js，确保可以
  },

  //事件处理函数console.log();
  getwasm: function () { //加载opencv.js,加载成功后开启监听器，进行帧处理
    let that = this;
    let wasmStart = Date.now();
    wasm.init({
      url: "https://www.wechatvr.org/opencvRealese/testTHQ_20210127/opencv_js.zip",
      // url: "https://www.wechatvr.org/opencvRealese/opencv1/opencv.zip",
      type: "zip", //格式：wasm,zip
      useCache: false, //是否使用缓存
      self: this,
      success: function (Module) {
        console.log("load wasm success");
        alertMini(`耗时${(Date.now()-wasmStart)/1000}秒`);
        cv = Module;
        console.log(cv);
        that.main();
      }
    });
  },


  main: async function () {
    let that = this;
    this.varInit(); //变量初始化
    await this.tempHandle(); //处理模板图

    let listener = wx.createCameraContext().onCameraFrame((res) => {
      if (cameraConfig.flag === false)
        return;
      dev.ifRecognized = false;
      let timeStart = Date.now();
      cameraConfig.flag = false; //立即停止下一帧的获取，等待当前帧处理后，再处理下一帧
      cameraConfig.frame.data = new Uint8ClampedArray(res.data); //更新实时帧的图像数据     
      if(!cameraConfig.ifHasWidthAndHeight){      //防止无用的重复赋值
        cameraConfig.frame.width = res.width;
        cameraConfig.frame.height = res.height;
        cameraConfig.frame.width = res.width;
        currentFrameSet.currentFrame = new cv.Mat(cameraConfig.frame.height, cameraConfig.frame.width, cv.CV_8UC4);
        cameraConfig.ifHasWidthAndHeight = true;   
      }      
     
      that.handleFrame(); 
      performance_monitoring(performMonitor, dev.ifRecognized, timeStart); //性能测试
    });
    startListen = function (resModel) {
      model = resModel;
      console.log("动画的position:", model.position);

      if (dev.ifStartListen) {
        listener.start();
      }
    };
    if (dev.ifStartListen) {
      listener.start();
    }
    // this.loadAnimation(animationUrl, startListen);
  },

  /*需要用到cv的相关变量的定义*/
  varInit: function () {
    cv.NORM_HAMMING = 6;
    cv.COLOR_RGB2GRAY = 7;
    cv.NORM_HAMMING = 6;
    cv.COLOR_RGBA2GRAY = 11;
    cv.RANSAC = 8;
    // currentFrameSet.currentFrame = new cv.Mat(cameraConfig.frame.height, cameraConfig.frame.width, cv.CV_8UC4);
    currentFrameSet.currentGray = new cv.Mat();
    currentFrameSet.detector = new cv.ORB(currentFrameSet.feature_size, 1.2, 1, 0);
    currentFrameSet.keyPoints = new cv.KeyPointVector();
    currentFrameSet.descriptors = new cv.Mat();
    currentFrameSet.goodMatches = new cv.DMatchVector();
    currentFrameSet.matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
    currentFrameSet.KNN_Matches = new cv.DMatchVectorVector();
    cameraConfig.newVertex = new cv.Mat();
    cameraConfig.oldVertex = new cv.Mat();


    //KCF相关变量
    KCF = new cv.FDSSTTracker(true, true, true, true);  //是否使用fHOG特征，是否固定大小，是否使用尺度滤波器，是否使用lab特征
    KCF.scale_step = 1;
    KCF.scale_lr = 0.03;
    KCF.interp_factor = 0.02;

    //不知道放在哪里的变量
    LK_pointOld = new cv.Mat();
    LK_pointOrigin = new cv.Mat();
    oldGray = new cv.Mat();
    LK_pointNew = new cv.Mat();
    st = new cv.Mat();
    err = new cv.Mat();
    winSize = new cv.Size(15, 15);
    criteria = new cv.TermCriteria(cv.TERM_CRITERIA_EPS | cv.TERM_CRITERIA_COUNT, 10, 0.01);
    KF = new cv.Mat();
    mask = new cv.Mat(cameraConfig.frame.height, cameraConfig.frame.width, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));
    p0 = new cv.Mat();
    homography = new cv.Mat();
    //产生颜色的随机值
    for (let i = 0; i < currentFrameSet.feature_size; i++) {
      color.push(new cv.Scalar(parseInt(Math.random() * 255), parseInt(Math.random() * 255),
        parseInt(Math.random() * 255), 255));
    }
  },

  handleFrame() {
    this.orbAndLKTrack();
    //this.setBackImage();    //此处后续要添加3D模型的渲染
    if (performMonitor.frameCount < dev.frameCount) {
      cameraConfig.flag = true; //每一帧图像处理完成，标志位更新，继续获取下一帧
    } else { //处理完所有的帧之后，输出性能测试结果
      console.log("识别出的帧数：", performMonitor.frameRecognizedCount);
      console.log("总共处理的帧数：", performMonitor.frameCount);
      console.log("识别率：", performMonitor.recogRate);
      console.log("帧率：", performMonitor.fps);
      console.log("使用了几次orb：", dev.orb);
    }
  },

  orbAndLKTrack() {
    let that = this;
    let startTime = Date.now();
    let { frame } = cameraConfig;
    let { currentFrame, currentGray } = currentFrameSet;

    currentFrame.data.set(frame.data); //摄像机图像的Mat格式

    if (dev.onlyDetect) {

        that.findFeaturePoints();

    } else if(dev.ifOrbAndLK) {

        cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY); //灰度化  
        if (flag_trackLK == 0) {
          that.findFeaturePoints(); //ORB找到初始角点
        } else {
          that.tracking_LK(); //特征点l-k跟踪
        }

    } else if (dev.ifOrbAndKCF) {
        if (flag_trackKCF == 0) {
          res = that.findInitialPosition(startTime); //ORB找到初始角点
          if(res[1]){        //如果找到了模板图的初始位置
            let position = res[0];    //box中含有初始位置
            box = new cv.Rect(position.x, position.y, position.width, position.height);      
            // box = new cv.Rect(50, 50, 150, 150);
            that.KCF_init(box); //KCF滤波器初始化    
            flag_trackKCF = 1;     
          }         
        } else {
          that.tracking_KCF(); //特征点KCF跟踪
        }
    }
  },

  tempHandle: async function () {
    let {
      originalFrameArray,
      originalKeyPointsArray,
      originalDescriptorsArray,
      vertexArray
    } = templateImage;
    /*图像金字塔*/
    // 不同尺度模板图片处理(得到特征点、描述子、Mat格式的顶点坐标)
    await init_originalFrameInfo(originalFrameArray, originalKeyPointsArray, originalDescriptorsArray, dev.image, 500, 500, cv, currentFrameSet.detector);
    init_originalBB(vertexArray, cv);
  },

  findFeaturePoints: function () {
    dev.orb++;
    let {
      currentFrame,
      currentGray,
      detector,
      feature_size,
      keyPoints,
      descriptors,
      matcher
    } = currentFrameSet;

    let {
      originalKeyPointsArray,
      originalDescriptorsArray,
      vertexArray,
      tempImage_id
    } = templateImage;

    let {
      newVertex,
      oldVertex,
      frame
    } = cameraConfig;


    //得到实时帧的特征点和描述子    

    // cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY); //灰度化    
  

    if (1) {
      detector.detect(currentGray, keyPoints); //得到特征点keyPoints    
      if (keyPoints.size() < 0.5 * feature_size) {
        console.log("info:keypoints is too few, return now...");
        return;
      }
      detector.compute(currentGray, keyPoints, descriptors); //得到描述子  


      // 筛选goodmatches良好匹配
      goodMatches = new cv.DMatchVector();
      for (let i = 0; i < 3; i++) {
        KNN_Matches = new cv.DMatchVectorVector();
        matcher.knnMatch(descriptors, originalDescriptorsArray[i], KNN_Matches, 2);
        // 筛选goodmatches良好匹配
        // console.log(`找到了${KNN_Matches.size()}个匹配点对`);
        for (let j = 0; j < KNN_Matches.size(); j++) {
          if (KNN_Matches.get(j).size() < 2) continue;
          let m = KNN_Matches.get(j).get(0);
          let n = KNN_Matches.get(j).get(1);
          if (m.distance < MatchRatio * n.distance) {
            goodMatches.push_back(m);
          }
        }
        // console.log("良好的点对个数：", goodMatches.size());
        if (goodMatches.size() > 20) {
          tempImage_id = i;
          break;
        } else {
          goodMatches = new cv.DMatchVector();
        }
        KNN_Matches.delete();
      }


      // 当goodMathc成功匹配数小于所设阈值时，提前结束
      if (tempImage_id == -1) {
        goodMatches.delete();
        cv.imshow(currentFrame);
        return;
      }

      // 从goodmatch匹配中获得分别获得相对应图像的关键点信息
      let matched1 = new cv.Mat(goodMatches.size(), 1, cv.CV_32FC2);
      let matched2 = new cv.Mat(goodMatches.size(), 1, cv.CV_32FC2);
      for (let i = 0; i < goodMatches.size(); i++) {
        matched1.data32F[2 * i] = Math.round(originalKeyPointsArray[tempImage_id].get(goodMatches.get(i).trainIdx).pt.x);
        matched1.data32F[2 * i + 1] = Math.round(originalKeyPointsArray[tempImage_id].get(goodMatches.get(i).trainIdx).pt.y);

        matched2.data32F[2 * i] = Math.round(keyPoints.get(goodMatches.get(i).queryIdx).pt.x);
        matched2.data32F[2 * i + 1] = Math.round(keyPoints.get(goodMatches.get(i).queryIdx).pt.y);
      }


      var inlierSize = 0;
      let inlierMatches = new cv.DMatchVector(); // 不需要测试时再删掉!!!!!!!!!!
      let inlierMask = new cv.Mat();
      // 计算多个二维点对之间的最优单映射变换矩阵 H（3行x3列） ，使用最小均方误差或者RANSAC方法
      homography = cv.findHomography(matched1, matched2, cv.RANSAC, RANSAC_THRESH, inlierMask);


      if (!homography.empty()) {
        // 更新符合单应矩阵的inlier内点特征集
        for (let i = 0; i < goodMatches.size(); i++) {
          if (inlierMask.charAt(i) == 1) {
            inlierSize++;
            inlierMatches.push_back(goodMatches.get(i));
          }
        }

        // 若符合阈值条件，则认为成功识别出区域，进行画框处理
        if (inlierSize / goodMatches.size() >= Min_InlierRatio && inlierSize >= 15) {
          console.log("特征匹配单应矩阵内点数量：", inlierSize);

          // 对坐标点进行投射变换,利用单应性矩阵,将原始四顶点objectBB得到新的对应四顶点newVertex    
          cv.perspectiveTransform(vertexArray[tempImage_id], newVertex, homography);

          // 判断识别区域是否大致符合四边形
          if (rectangle(newVertex)) {
            cameraConfig.oldVertex = newVertex;
            draw_bounding_box(currentFrame, newVertex, cv); // 画出识别区域四周边框
            cv.imshow(currentFrame);
            dev.ifRecognized = true;

            //利用goodFeaturesToTrack去提取识别区域角点信息
            let mask_track = new cv.Mat.zeros(frame.height, frame.width, cv.CV_8UC1);
            let square_point_data = new Uint16Array([
              newVertex.data32F[0], newVertex.data32F[1],
              newVertex.data32F[2], newVertex.data32F[3],
              newVertex.data32F[4], newVertex.data32F[5],
              newVertex.data32F[6], newVertex.data32F[7]
            ]);
            let square_points = cv.matFromArray(4, 1, cv.CV_32SC2, square_point_data);
            cv.fillConvexPoly(mask_track, square_points, new cv.Scalar(255));
            cv.goodFeaturesToTrack(currentGray, p0, maxCorners, qualityLevel, minDistance, mask_track, blockSize);
            console.log("goodfeature:", p0.size().height);
            if (p0.size().height < 0) {
              cv.imshow("outputCanvas", currentFrame);
              return
            }

            // 更新光流追踪点
            LK_pointOld = new cv.Mat(p0.size().height, 1, cv.CV_32FC2);
            LK_pointOrigin = new cv.Mat(inlierSize, 1, cv.CV_32FC2);
            for (let i = 0; i < p0.size().height; i++) {
              //                            cv.circle(newFrame, { x: p0.data32F[i * 2], y: p0.data32F[i * 2 + 1]}, 3, color[i],-1);

              LK_pointOld.data32F[i * 2] = p0.data32F[i * 2];
              LK_pointOld.data32F[i * 2 + 1] = p0.data32F[i * 2 + 1];

              /*LK_pointOrigin.data32F[i * 2] = p0.data32F[i * 2];
              LK_pointOrigin.data32F[i * 2 + 1] = p0.data32F[i * 2 + 1];*/
            }



            currentGray.copyTo(oldGray);
            originLKPointSize = inlierSize; //更新lk光流初始追踪特征的数量
            flag_trackLK = 1; // 开启光流追踪标志
            flag_BB = 0; // 标志位：捕捉四组识别区域顶点坐标
            temp_4BBArray = []; // 重新捕捉四组识别区域顶点坐标

            // KF = new cv.KalmanFilter(nStates, nMeasurements, nInputs, cv.CV_64F); // instantiate Kalman Filter
            // initKalmanFilter(KF, nStates, nMeasurements, nInputs, dt, cv);
            //更新光流追踪轨迹
            mask = new cv.Mat(frame.height, frame.width, cv.CV_8UC4, new cv.Scalar(0, 0, 0, 255));

            // 保证姿态估计按照默认原始最佳方案
            let marker_corner = [{
              'x': newVertex.data32F[0],
              'y': newVertex.data32F[1]
            }, {
              'x': newVertex.data32F[2],
              'y': newVertex.data32F[3]
            }, {
              'x': newVertex.data32F[4],
              'y': newVertex.data32F[5]
            }, {
              'x': newVertex.data32F[6],
              'y': newVertex.data32F[7]
            }];

            var temp_pose = poseEstimate(marker_corner, frame.width, frame.height, modelSize);
            originalRotation = rot2euler(temp_pose.rotation1);
            console.log("angle:", originalRotation);
          }
        }
      }
    }
    // currentFrame.delete();
  }, 

  findInitialPosition: function(time){    
    dev.orb++;
    let x, y, width, height, ifFindPosition = false;
    let {
      currentFrame,  
      currentGray,   
      detector,      
      feature_size,
      keyPoints,     
      descriptors,
      matcher
    } = currentFrameSet;

    let {
      originalKeyPointsArray,
      originalDescriptorsArray,
      vertexArray,
      tempImage_id
    } = templateImage;

    let {
      newVertex,
      oldVertex,
      frame
    } = cameraConfig;


    //得到实时帧的特征点和描述子    
    // currentFrame.data.set(frame.data); //摄像机图像的Mat格式

    cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY); //灰度化    
  

    if (1) {
      detector.detect(currentGray, keyPoints); //得到特征点keyPoints    
      if (keyPoints.size() < 0.5 * feature_size) {
        console.log("info:keypoints is too few, return now...");    //特征点过少，返回
        cv.imshow(currentFrame);
        return [{x, y, width, height}, ifFindPosition];
      }
      detector.compute(currentGray, keyPoints, descriptors); //得到描述子  


      // 筛选goodmatches良好匹配
      goodMatches = new cv.DMatchVector();
      for (let i = 0; i < 4; i++) {
        KNN_Matches = new cv.DMatchVectorVector();
        matcher.knnMatch(descriptors, originalDescriptorsArray[i], KNN_Matches, 2);
        // 筛选goodmatches良好匹配
        // console.log(`找到了${KNN_Matches.size()}个匹配点对`);
        for (let j = 0; j < KNN_Matches.size(); j++) {
          if (KNN_Matches.get(j).size() < 2) continue;
          let m = KNN_Matches.get(j).get(0);
          let n = KNN_Matches.get(j).get(1);
          if (m.distance < MatchRatio * n.distance) {
            goodMatches.push_back(m);
          }
        }
        // console.log("良好的点对个数：", goodMatches.size());
        if (goodMatches.size() > 20) {
          tempImage_id = i;
          break;
        } else {
          goodMatches = new cv.DMatchVector();
        }
        KNN_Matches.delete();
      }


      // 当goodMathc成功匹配数小于所设阈值时，提前结束
      if (tempImage_id == -1) {
        goodMatches.delete();
        cv.imshow(currentFrame);
        return [{x, y, width, height}, ifFindPosition]; 
      }

      // 从goodmatch匹配中获得分别获得相对应图像的关键点信息
      let matched1 = new cv.Mat(goodMatches.size(), 1, cv.CV_32FC2);
      let matched2 = new cv.Mat(goodMatches.size(), 1, cv.CV_32FC2);
      for (let i = 0; i < goodMatches.size(); i++) {
        matched1.data32F[2 * i] = Math.round(originalKeyPointsArray[tempImage_id].get(goodMatches.get(i).trainIdx).pt.x);
        matched1.data32F[2 * i + 1] = Math.round(originalKeyPointsArray[tempImage_id].get(goodMatches.get(i).trainIdx).pt.y);
        
        matched2.data32F[2 * i] = Math.round(keyPoints.get(goodMatches.get(i).queryIdx).pt.x);
        matched2.data32F[2 * i + 1] = Math.round(keyPoints.get(goodMatches.get(i).queryIdx).pt.y);
      }

      // console.log(matched2);
      // debugger;
      // for(let i=0;i<matched2.length;i++){
      //   cv.circle(currentFrame, {  
      //         x: matched2.data32F[2 * i],
      //         y: matched2.data32F[2 * i + 1]
      //       }, 5, color[0], -1);
      // }
      


      var inlierSize = 0;
      let inlierMatches = new cv.DMatchVector(); // 不需要测试时再删掉!!!!!!!!!!
      let inlierMask = new cv.Mat();
      // 计算多个二维点对之间的最优单映射变换矩阵 H（3行x3列） ，使用最小均方误差或者RANSAC方法
      homography = cv.findHomography(matched1, matched2, cv.RANSAC, RANSAC_THRESH, inlierMask);


      if (!homography.empty()) {
        // 更新符合单应矩阵的inlier内点特征集
        for (let i = 0; i < goodMatches.size(); i++) {
          if (inlierMask.charAt(i) == 1) {
            inlierSize++;
            inlierMatches.push_back(goodMatches.get(i));
          }
        }

        // 若符合阈值条件，则认为成功识别出区域，进行画框处理
        if (inlierSize / goodMatches.size() >= Min_InlierRatio && inlierSize >= 15) {
          console.log("特征匹配单应矩阵内点数量：", inlierSize);

          // 对坐标点进行投射变换,利用单应性矩阵,将原始四顶点vertexArray得到新的对应四顶点newVertex    
          cv.perspectiveTransform(vertexArray[tempImage_id], newVertex, homography);
                    
          // 判断识别区域是否大致符合四边形
          if (rectangle(newVertex)) {
            cameraConfig.oldVertex = newVertex;
            let x_min = Math.min(newVertex.data32F[0], newVertex.data32F[6]);
            let x_max = Math.max(newVertex.data32F[2], newVertex.data32F[4]);
            let y_min = Math.min(newVertex.data32F[1], newVertex.data32F[3]);
            let y_max = Math.max(newVertex.data32F[5], newVertex.data32F[7]);
            width = Math.abs(x_max - x_min);
            height = Math.abs(y_max - y_min);
            x = x_min;
            y = y_min;
            let vertex = [];
            vertex[0] = vertex[6] = x_min;
            vertex[2] = vertex[4] = x_max;
            vertex[1] = vertex[3] = y_min;
            vertex[5] = vertex[7] = y_max;
            ifFindPosition = true;
            // draw_bounding_box(currentFrame, vertex, cv, "number"); // 画出识别区域四周边框
            // cv.circle(currentFrame, {                    //画出中心点
            //   x: x,
            //   y: y
            // }, 5, color[0], -1);

            // cv.imshow(currentFrame);
            console.log(`耗时${Date.now()-time}ms`);
          }
        }
      }
    }
    return [{x, y, width, height}, ifFindPosition];
  },

  tracking_LK: function () {
    let {
      currentFrame,
      currentGray
    } = currentFrameSet;

    // currentFrame.data.set(cameraConfig.frame.data); //摄像机图像的Mat格式
    
    let time = Date.now();

    cv.calcOpticalFlowPyrLK(oldGray, currentGray, LK_pointOld, LK_pointNew, st, err, winSize, maxLevel, criteria);
    console.log("lk耗时：", Date.now()-time);
    this.calculate_transform_new();
    // currentFrame.delete();
  },

  KCF_init: function(box){
    let {
      currentFrame,
      currentGray
    } = currentFrameSet;
    //KCF跟踪代码
    cv.cvtColor(currentFrame, currentGray, 11);
    KCF.init(currentGray, box);
    
  },

  tracking_KCF: function(){
    let {
      currentFrame,
      currentGray
    } = currentFrameSet;
    //KCF跟踪代码
    cv.cvtColor(currentFrame, currentGray, 11);
      let startTime = Date.now();
      let roi = KCF.update(currentGray);
      console.log(`KCF耗时${Date.now()-startTime}ms`);
      if(0){   //!bool
        notFindKCF++;
        if(notFindKCF > 5){   //bool值为false达到5次，视为跟丢
          flag_trackKCF = 0;
          notFindKCF = 0;
          return;
        }
      }
      let vertex = [];
      vertex[0] = vertex[6] = roi.x;
      vertex[1] = vertex[3] = roi.y;
      vertex[2] = vertex[4] = roi.x + roi.width;
      vertex[5] = vertex[7] = roi.y + roi.height;

      let timeTemp = Date.now()      
      // model_poseUpdateKCF(vertex, cameraConfig.frame.width, cameraConfig.frame.height, modelSize, model, cv);
      console.log("更改模型位置耗时：", Date.now()-timeTemp);
      
      dev.ifRecognized = true;    //跟踪到了模板图，更新性能测试指标
      let {x, y, width, height} = roi;
      let newFdsstVertex = [
        x, y, x+width, y, x+width, y+height, x, y+height
      ];
      draw_bounding_box(currentFrame, newFdsstVertex, cv, "number");
      // console.log(KCF.box);	
      // cv.circle(currentFrame, {
      //   x: (roi.x + 0.5*(roi.width)),
      //   y: (roi.y + 0.5*(roi.height)),
      // }, 5, new cv.Scalar(0, 0, 255, 255), -1);

      cv.imshow(currentFrame);  
      console.log("KCF跟踪&&绘制中心点&&展示图像耗时：", Date.now()-startTime);  
  },

  calculate_transform_new: function () {
    let startTime = Date.now(); 
    let {
      newVertex,
      oldVertex
    } = cameraConfig;

    let {
      currentGray,
      currentFrame
    } = currentFrameSet;

    flag_trackLK = 0; // 将光流标志位重置为0

    let good_cnt = 0; // 初步光流追踪成功的数量
    let inlierSize = 0; // 经ransac算法处理后成功识别的数量
    for (let i = 0; i < st.rows; i++) {
      if (st.data[i] === 1) {
        good_cnt++;
      }
    }
    // console.log("追踪成功的点", good_cnt);


    let goodNew = new cv.Mat(good_cnt, 1, cv.CV_32FC2); //存储光流跟踪到的角点
    let goodOld = new cv.Mat(good_cnt, 1, cv.CV_32FC2); //存储原始的托马斯角点
    let goodOrigin = new cv.Mat(good_cnt, 1, cv.CV_32FC2);

    var distance_xy = 0;
    var j = 0;
    for (let i = 0; i < st.rows; i++) {
      if (st.data[i] === 1) {
        goodNew.data32F[2 * j] = LK_pointNew.data32F[i * 2];
        goodNew.data32F[2 * j + 1] = LK_pointNew.data32F[i * 2 + 1];

        goodOld.data32F[2 * j] = LK_pointOld.data32F[i * 2];
        goodOld.data32F[2 * j + 1] = LK_pointOld.data32F[i * 2 + 1];

        /*goodOrigin.data32F[2 * j] = LK_pointOrigin.data32F[i * 2];
        goodOrigin.data32F[2 * j + 1] = LK_pointOrigin.data32F[i * 2 + 1];*/

        j++;
      }
    }


    // 至少满足单应性所需的四组对应点
    if (good_cnt >= 4) {


      let inlierMask = new cv.Mat();
      // 计算多个二维点对之间的最优单映射变换矩阵 H（3行x3列） ，使用最小均方误差或者RANSAC方法
      //                homography = cv.findHomography(goodOrigin, goodNew, cv.RANSAC, RANSAC_THRESH_high, inlierMask);
      homography = cv.findHomography(goodOld, goodNew, cv.RANSAC, RANSAC_THRESH_high, inlierMask);

      if (!homography.empty()) {
        // 更新inlierMask,即正确匹配的点
        for (let i = 0; i < good_cnt; i++) {
          if (inlierMask.charAt(i) == 1) {
            inlierSize += 1;
          }
        }


        //                    console.log("inlier:", inlierSize, originLKPointSize);
        // 若符合阈值条件，则认为成功识别出区域，进行画框处理
        if (inlierSize / originLKPointSize >= Min_InlierRatio || inlierSize >= Min_InlierSize) {

          //                            cv.perspectiveTransform(originBB, newBB, homography);    

          cv.perspectiveTransform(oldVertex, newVertex, homography);



          if (flag_BB < 4) {
            temp_4BBArray.push(newVertex);
            flag_BB++;
            if (flag_BB == 4) {
              init_smoothBBArray(smoothBBArray, temp_4BBArray);
            }
          } else {
            //                            console.log("old:",newBB.data32F[0],newBB.data32F[1]);
            newVertex = window_smooth(smoothBBArray, newVertex, cv);
            //                            console.log("new:",newBB.data32F[0],newBB.data32F[1]);
          }
          console.log("光流跟踪耗时：", Date.now()-startTime);


          // draw_bounding_box(currentFrame, newVertex, cv);
          dev.ifRecognized = true;

          //进行模型渲染
          model_poseUpdate(newVertex, cameraConfig.frame.width, cameraConfig.frame.height, modelSize, originalRotation, model, cv);

          /* // 画出特征匹配结果
           drawMatches1(originalFrameArray[flag_index], newFrame, goodOrigin, goodNew, grayMatchingImage, color, good_cnt, originalBBArray[flag_index], newBB);
           cv.imshow("outputCanvas", grayMatchingImage);*/





          // 绘制角点的轨迹
          for (let i = 0; i < good_cnt; i++) {
            // try {
            //      cv.line(mask,
            //          {x: goodNew.data32F[2 * i], y: goodNew.data32F[2 * i + 1]},
            //          {x: goodOld.data32F[2 * i], y: goodOld.data32F[2 * i + 1]},
            //          color[i], 1);
            //  } catch (error) {
            //      console.log(error)
            //      flag_trackLK = 0;
            //      return;
            //  }

            // cv.circle(currentFrame, {
            //   x: goodNew.data32F[2 * i],
            //   y: goodNew.data32F[2 * i + 1]
            // }, 5, color[0], -1);
          }
          // cv.add(currentFrame, mask, currentFrame);
          let start = Date.now();
          cv.imshow(currentFrame);
          console.log("imshow耗时：", Date.now()-start);
          console.log("光流跟踪+绘制识别框耗时：", Date.now()-startTime);


          // 更新各个所需变量
          flag_trackLK = 1;
          oldVertex = newVertex; // 更新顶点坐标
          currentGray.copyTo(oldGray); //更新上一帧图像

          //更新上一帧中成功匹配homograpyh的追踪点
          LK_pointOld.delete();
          LK_pointOld = null;
          LK_pointOld = new cv.Mat(inlierSize, 1, cv.CV_32FC2);

          //更新原始模板图片对应的追踪点
          LK_pointOrigin.delete();
          LK_pointOrigin = null;
          LK_pointOrigin = new cv.Mat(inlierSize, 1, cv.CV_32FC2);
          var j = 0;
          for (let i = 0; i < good_cnt; i++) {
            if (inlierMask.charAt(i) == 1) {
              LK_pointOld.data32F[j * 2] = goodNew.data32F[2 * i];
              LK_pointOld.data32F[j * 2 + 1] = goodNew.data32F[2 * i + 1];

              LK_pointOrigin.data32F[j * 2] = goodOrigin.data32F[2 * i];
              LK_pointOrigin.data32F[j * 2 + 1] = goodOrigin.data32F[2 * i + 1];

              j++;
            }
          }
        }
      }
    }
  },









  /* webgl相关*/

  //加载动画
  loadAnimation: function (modelUrl, callback) {
    let that = this;
    let {
      height,
      width
    } = cameraConfig.frame;
    const query = wx.createSelectorQuery().in(that);
    let nodeTemp = query.selectAll('#myCanvas');
    nodeTemp.node();
    query.exec(function (res) {
      let canvasId = res[0][0].node._canvasId;
      const canvas = new THREE.global.registerCanvas(res[0][0].node);
      // that.setData({
      //   canvasId
      // })
      fbxModelLoad(canvas, modelUrl, THREE, width, height, callback);
    })
  },



  webglInit() {
    wx.createSelectorQuery().select('#animation')
      .node()
      .exec((res) => {
        let webcanvas = res[0].node;
        let k = cameraConfig.frame.width / cameraConfig.frame.height;
        let s = cameraConfig.frame.height / 2;
        camera = new THREE.OrthographicCamera(-s * k, s * k, s, -s, 1, 155);
        var x = cameraConfig.frame.width / 2;
        var y = -1 * cameraConfig.frame.height / 2;
        //使camera正对中心
        camera.position.set(x, y, 150);
        camera.lookAt(x, y, 0);

        renderer = new THREE.WebGLRenderer({
          // canvas: webcanvas,
          antialias: true, //反锯齿
          alpha: true //透明
        });
        let ambient = new THREE.AmbientLight(0xF5F5F5);
        scene = new THREE.Scene();
        scene.add(ambient);
        model = new THREE.Object3D();
        scene.add(model);
        console.log('完成webgl');
      });
  },
  setBackImage() {
    let geometry = new THREE.PlaneGeometry(cameraConfig.frame.width, cameraConfig.frame.height); //矩形平面
    let texture = new THREE.DataTexture(cameraConfig.frame.data, cameraConfig.frame.width, cameraConfig.frame.height, THREE.RGBAFormat);

    //texture.needsUpdate = true; //纹理更新，作用存疑，似乎是正作用
    let tex_material = new THREE.MeshPhongMaterial({
      map: texture, // 设置纹理贴图
      side: THREE.DoubleSide
    });
    geometry.translate(cameraConfig.frame.width / 2, cameraConfig.frame.height / 2, 0);
    geometry.rotateX(Math.PI);
    let mesh = new THREE.Mesh(geometry, tex_material);
    scene.add(mesh);
    renderer.render(scene, camera);
  },


  /*图像帧尺寸自适应*/
  frameSizeInit() {
    const platform = wx.getSystemInfoSync().platform;
    console.log(platform);
    if( platform == "android" ){      //小米9(红米pro)的帧尺寸
      cameraConfig.frame.width = 288;
      cameraConfig.frame.height = 384;
    } else if(platform == "devtools") {
      cameraConfig.frame.width = 288;
      cameraConfig.frame.height = 352;
    }
  },

  touchStart(e) {
    THREE.global.touchEventHandlerFactory('canvas', 'touchstart')(e)
  },
  touchMove(e) {
    THREE.global.touchEventHandlerFactory('canvas', 'touchmove')(e)
  },
  touchEnd(e) {
    THREE.global.touchEventHandlerFactory('canvas', 'touchend')(e)
  },
})