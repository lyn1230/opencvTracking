const THREE = require("../../utils/three.min.js");
const wasm = require("../../utils/wasm");
const util = require("../../utils/util");
var cv;
var listener;


const cameraConfig = {
  flag: true, //是否获取下一个实时帧 
  frame: { //实时帧数据
    data: new Uint8Array(288 * 352),
    width: 0,
    height: 0
  },
};
const performMonitor = { //性能监视器
  fps: 0, //帧率
  frameCount: 0 //记录总共处理的帧数
};
let camera, renderer, scene; //three.js相关的三大要素

const templateImage = {
  originalDescriptorsArray: new Array(),
  originalKeyPointsArray: new Array(),
  originalFrameArray: new Array(),
  imageTem: [
    "https://www.wechatvr.org/imageTemplate/template_0.jpg",
    "https://www.wechatvr.org/imageTemplate/template_1.jpg",
    "https://www.wechatvr.org/imageTemplate/template_2.jpg",
    "https://www.wechatvr.org/imageTemplate/template_3.jpg",
  ],
  imageSchool: [
    "https://www.wechatvr.org/imageTemplate/school_0.jpg",
    "https://www.wechatvr.org/imageTemplate/school_1.jpg",
    "https://www.wechatvr.org/imageTemplate/school_2.jpg",
    "https://www.wechatvr.org/imageTemplate/school_3.jpg",
  ],
};
let dev = {
  ifStartListen: true,
  image: templateImage.imageTem
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
const nextFrameSet = {

};

//不知道放在哪里的变量
const MatchRatio = 0.8;
//不知道放在哪里的变量




Page({
  data: {
    frameSize: "small"
  },

  //生命周期函数--监听页面初次渲染完成
  onReady: function () {
    this.frameSizeInit(); //自动适配实时帧的宽高
    // this.webglInit();        //webgl初始化
    this.getwasm(); //加载opencv.js，确保可以
  },

  //事件处理函数console.log();
  getwasm: function () { //加载opencv.js,加载成功后开启监听器，进行帧处理
    let that = this;
    let wasmStart = Date.now();
    wasm.init({
      url: "https://www.wechatvr.org/opencv/opencv.zip",
      type: "zip", //格式：wasm,zip
      useCache: true, //是否使用缓存
      self: this,
      success: function (Module) {
        util.alert(`耗时${(Date.now()-wasmStart)/1000}秒`);
        cv = Module;
        that.main();
      }
    });
  },
  getgray: function () {
    cv.imread("http://www.aiotforest.com/lena.png", function (mat) {
      let src = mat;
      let dstx = new cv.Mat();
      cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
      cv.imshow(src);
      src.delete();
      dstx.delete();
    });
  },
  getcamera: function () {
    var self = this;
    if (!this.facexmlflag) {
      this.facexmlflag = true;
      wx.downloadFile({
        url: 'http://www.aiotforest.com/haarcascade_frontalface_default.xml',
        filePath: cv.USER_DATA_PATH + "/haarcascade_frontalface_default.xml",
        success: function () {
          self.faceflag = true;
        }
      })
    }
    if (!this.eyesxmlflag) {
      this.eyesxmlflag = true;
      wx.downloadFile({
        url: 'http://www.aiotforest.com/haarcascade_eye.xml',
        filePath: cv.USER_DATA_PATH + "/haarcascade_eye.xml",
        success: function () {
          self.eyesflag = true;
        }
      })
    }
    if (this.faceflag && this.eyesflag) {
      cv.FS_createDataFile("/", "haarcascade_frontalface_default.xml", new Uint8Array(cv.FSM.readFileSync(cv.USER_DATA_PATH + "haarcascade_frontalface_default.xml")), true, false, undefined);
      self.faceCascade = new cv.CascadeClassifier();
      self.faceCascade.load("/haarcascade_frontalface_default.xml");

      cv.FS_createDataFile("/", "haarcascade_eye.xml", new Uint8Array(cv.FSM.readFileSync(cv.USER_DATA_PATH + "haarcascade_eye.xml")), true, false, undefined);
      self.eyesCascade = new cv.CascadeClassifier();
      self.eyesCascade.load("/haarcascade_eye.xml");

      const context = wx.createCameraContext()
      listener = context.onCameraFrame((frame) => {
        self.cameraData = frame;
      })
      listener.start();
      self.detectloop();
    } else {
      setTimeout(this.getcamera, 100);
    }
  },
  facexmlflag: false,
  eyesxmlflag: false,
  faceflag: false,
  eyesflag: false,
  cameraData: undefined,
  detectloop: function () {
    var self = this;
    if (typeof self.cameraData == "object") {
      self.detectFace(self.cameraData);
      setTimeout(self.detectloop, 0);
    } else {
      setTimeout(self.detectloop, 100);
    }
  },

  detectFace: function (frame) {
    var self = this;
    var src = cv.matFromImageData({
      data: new Uint8ClampedArray(frame.data),
      width: frame.width,
      height: frame.height
    });
    var gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
    var faces = new cv.RectVector();
    let eyes = new cv.RectVector();
    var faceCascade = self.faceCascade;
    faceCascade.detectMultiScale(gray, faces, 1.1, 5, 0);
    for (var i = 0; i < faces.size(); ++i) {
      var roiGray = gray.roi(faces.get(i));
      var roiSrc = src.roi(faces.get(i));
      var point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
      var point2 = new cv.Point(faces.get(i).x + faces.get(i).width,
        faces.get(i).y + faces.get(i).height);
      cv.rectangle(src, point1, point2, [255, 0, 0, 255]);

      var eyesCascade = self.eyesCascade;
      eyesCascade.detectMultiScale(roiGray, eyes);
      for (let j = 0; j < eyes.size(); ++j) {
        let point1 = new cv.Point(eyes.get(j).x, eyes.get(j).y);
        let point2 = new cv.Point(eyes.get(j).x + eyes.get(j).width,
          eyes.get(j).y + eyes.get(j).height);
        cv.rectangle(roiSrc, point1, point2, [0, 0, 255, 255]);
      }

      roiGray.delete();
      roiSrc.delete();
    }
    cv.imshow(src);
    src.delete();
    gray.delete();
    faces.delete();
  },

  stop: function () {
    listener.stop();
  },

  main: function () {
    let that = this;
    this.varInit(); //变量初始化，防止变量太多造成程序结构混乱，将具有共性的变量统一起来
    let listener = wx.createCameraContext().onCameraFrame((res) => {
      if (cameraConfig.flag === false)
        return;
      let timeStart = Date.now();
      cameraConfig.flag = false; //立即停止下一帧的获取，等待当前帧处理后，再处理下一帧
      cameraConfig.frame.data = new Uint8Array(res.data); //更新实时帧的图像数据
      that.handleFrame(); //将摄像头图像放置到webgl背景中（后续添加图像算法处理）
      ++performMonitor.frameCount;
      console.log("run time:", (Date.now() - timeStart), "ms");
      performMonitor.fps = 1000 / (Date.now() - timeStart);
      // console.log("FPS:", performMonitor.fps);
    });
    if (dev.ifStartListen) {
      listener.start();
    }
  },

  /*相关变量的定义*/
  varInit: function () {
    currentFrameSet.currentFrame = new cv.Mat(cameraConfig.frame.height, cameraConfig.frame.width, cv.CV_8UC4);
    currentFrameSet.currentGray = new cv.Mat();
    currentFrameSet.detector = new cv.ORB(currentFrameSet.feature_size, 1.2, 1, 0);
    currentFrameSet.keyPoints = new cv.KeyPointVector();
    currentFrameSet.descriptors = new cv.Mat();
    currentFrameSet.goodMatches = new cv.DMatchVector();
    currentFrameSet.matcher = new cv.BFMatcher(cv.NORM_HAMMING, false);
    currentFrameSet.KNN_Matches = new cv.DMatchVectorVector();
  },

  handleFrame() {
    this.findNaturlImage();
    //this.setBackImage();    //此处后续要添加3D模型的渲染
    if (performMonitor.frameCount < 6)
      cameraConfig.flag = true; //每一帧图像处理完成，标志位更新，继续获取下一帧
  },

  findNaturlImage() {
    this.tempHandle(); //处理模板图
    this.findFeaturePoints(); //找到初始角点
    //await this.tracking();             //特征点跟踪
  },

  tempHandle: function () {
    /*图像金字塔*/
    // 不同尺度模板图片处理(得到特征点和描述子)
    util.init_originalFrameInfo(templateImage.originalFrameArray, templateImage.originalKeyPointsArray, templateImage.originalDescriptorsArray, dev.image, 500, 500, cv, currentFrameSet.detector);


    // // 不同尺度模板图片顶点坐标
    // let newBB = new cv.Mat();
    // let oldBB = new cv.Mat();
    // let originBB = new cv.Mat();
    // let originalBBArray = new Array(); //此数组里面有4个Mat格式的数据
    // init_originalBB(originalBBArray);
  },

  findFeaturePoints: function () {
    console.log("开始寻找初始角点...");
    let {
      currentFrame,
      currentGray,
      detector,
      feature_size,
      keyPoints,
      descriptors,
      KNN_Matches
    } = currentFrameSet;

    let {
      originalDescriptorsArray
    } = templateImage;

    currentFrame.data.set(cameraConfig.frame.data); //摄像机图像的Mat格式
    cv.cvtColor(currentFrame, currentGray, cv.COLOR_RGBA2GRAY); //灰度化    
    detector.detect(currentGray, keyPoints); //得到特征点keyPoints    
    console.log("keyPoints:", keyPoints);
    let actualNumber = keyPoints.size();
    console.log("特征点识别数量：", actualNumber);
    if (actualNumber < 0.5 * feature_size) {
      console.log("info:keypoints is too few, return now...");
      return;
    }
    detector.compute(currentGray, keyPoints, descriptors);
    console.log("descriptors:", descriptors); //得到描述子
    currentFrameSet.matcher.knnMatch(descriptors, originalDescriptorsArray[0], KNN_Matches, 2);
    console.log("@@@@@", KNN_Matches.size());
    // 筛选goodmatches良好匹配
    for (let j = 0; j < KNN_Matches.size(); j++) {
      if (KNN_Matches.get(j).size() < 2) continue;
      let m = KNN_Matches.get(j).get(0);
      let n = KNN_Matches.get(j).get(1);
      if (m.distance < MatchRatio * n.distance) {
        goodMatches.push_back(m);
      }
    }
  },

  tracking: function () {

  },








  /* webgl相关*/
  webglInit() {
    wx.createSelectorQuery().select('#canvasId')
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
          canvas: webcanvas,
          // antialias: true,//反锯齿
          // alpha: true//透明
        });
        let ambient = new THREE.AmbientLight(0xF5F5F5);
        scene = new THREE.Scene();
        scene.add(ambient);
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
    if (this.data.frameSize === "small") {
      cameraConfig.frame.width = 288;
      cameraConfig.frame.height = 352;
    } else if (this.data.frameSize === "medium") {
      cameraConfig.frame.width = 480;
      cameraConfig.frame.height = 640;
    } else if (this.data.frameSize === "large") {
      cameraConfig.frame.width = 720;
      cameraConfig.frame.height = 1280;
    }
  }
})