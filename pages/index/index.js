const THREE = require("../../utils/three.min.js");
const wasm = require("../../utils/wasm");
const util = require("../../utils/util");
var cv;
var listener;

let dev = {
  ifStartListen: false
};

const cameraConfig = {
  flag: true,                           //是否获取下一个实时帧 
  frame: {                              //实时帧数据
    data: new Uint8Array(288 * 352),
    width: 0,
    height: 0
  },
};
const performMonitor = {          //性能监视器
  fps: 0,                       //帧率
  frameCount: 0                 //记录总共处理的帧数
};
let camera, renderer, scene;   //three.js相关的三大要素


Page({
  data: {
    frameSize: "small"
  },

   //生命周期函数--监听页面加载
  onLoad: function (options) {
    this.frameSizeInit();    //自动适配实时帧的宽高
    this.getwasm();        //加载opencv.js，确保可以
  },


   //生命周期函数--监听页面初次渲染完成
  onReady: function () {  
    this.webglInit();                  //webgl初始化
  },

 
   //生命周期函数--监听页面显示
  onShow: function () {

  },

  
   //生命周期函数--监听页面隐藏   
  onHide: function () {

  },

  
   //生命周期函数--监听页面卸载   
  onUnload: function () {

  },

   // 页面相关事件处理函数--监听用户下拉动作
  onPullDownRefresh: function () {

  },

  
   // 页面上拉触底事件的处理函数
  onReachBottom: function () {

  },

  
   // 用户点击右上角分享  
  onShareAppMessage: function () {

  },

  //事件处理函数
  getwasm: function () {          //加载opencv.js,加载成功后开启监听器，进行帧处理
    let that = this;
    let wasmStart = Date.now();
    wasm.init({
      url:"https://www.wechatvr.org/opencv/opencv.zip",
      type:"zip", //格式：wasm,zip
      useCache:true, //是否使用缓存
      self:this,
      success: function (Module) {
        util.alert(`耗时${(Date.now()-wasmStart)/1000}秒`);
        cv=Module;
        console.log(cv);
        that.main();
      }
    });
  },
  getgray: function () {
    cv.imread("http://www.aiotforest.com/lena.png",function(mat){
      let src = mat;
      let dstx = new cv.Mat();
      cv.cvtColor(src, src, cv.COLOR_RGB2GRAY, 0);
      cv.imshow(src);
      src.delete();
      dstx.delete();
    });
  },
  getcamera:function(){
    var self=this;
    if(!this.facexmlflag){
      this.facexmlflag=true;
      wx.downloadFile({
        url: 'http://www.aiotforest.com/haarcascade_frontalface_default.xml',
        filePath:cv.USER_DATA_PATH+"/haarcascade_frontalface_default.xml",
        success:function(){
          self.faceflag=true;
        }
      })
    }
    if(!this.eyesxmlflag){
      this.eyesxmlflag=true;
      wx.downloadFile({
        url: 'http://www.aiotforest.com/haarcascade_eye.xml',
        filePath:cv.USER_DATA_PATH+"/haarcascade_eye.xml",
        success:function(){
          self.eyesflag=true;
        }
      })
    }
    if(this.faceflag&&this.eyesflag){
      cv.FS_createDataFile("/", "haarcascade_frontalface_default.xml", new Uint8Array(cv.FSM.readFileSync(cv.USER_DATA_PATH+"haarcascade_frontalface_default.xml")), true, false, undefined);
      self.faceCascade = new cv.CascadeClassifier();
      self.faceCascade.load("/haarcascade_frontalface_default.xml");

      cv.FS_createDataFile("/", "haarcascade_eye.xml", new Uint8Array(cv.FSM.readFileSync(cv.USER_DATA_PATH+"haarcascade_eye.xml")), true, false, undefined);
      self.eyesCascade = new cv.CascadeClassifier();
      self.eyesCascade.load("/haarcascade_eye.xml");

      const context = wx.createCameraContext()
      listener = context.onCameraFrame((frame) => {
        self.cameraData=frame;
      })
      listener.start();
      self.detectloop();
    }else{
      setTimeout(this.getcamera,100);
    }
  },
  facexmlflag:false,
  eyesxmlflag:false,
  faceflag:false,
  eyesflag:false,
  cameraData:undefined,
  detectloop:function(){
    var self=this;
    if(typeof self.cameraData=="object"){
      self.detectFace(self.cameraData);
      setTimeout(self.detectloop,0);
    }else{
      setTimeout(self.detectloop,100);
    }
  },

  detectFace:function(frame){
    var self=this;
    var src = cv.matFromImageData({
      data:new Uint8ClampedArray(frame.data),
      width:frame.width,
      height:frame.height
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
  
  stop:function(){
    listener.stop();
  },
  
  main: function(){
    let that = this;
    let listener = wx.createCameraContext().onCameraFrame((res) => {      
      if (cameraConfig.flag === false)
        return;
      let timeStart = Date.now();
      cameraConfig.flag = false;                             //立即停止下一帧的获取，等待当前帧处理后，再处理下一帧
      cameraConfig.frame.data = new Uint8Array(res.data);    //更新实时帧的图像数据
      that.handleFrame();                 //将摄像头图像放置到webgl背景中（后续添加图像算法处理）
      // console.log(performMonitor.frameCount++);
      console.log("run time:", (Date.now() - timeStart));
      performMonitor.fps = 1000 / (Date.now() - timeStart);
      // console.log("FPS:", performMonitor.fps);
    });
    if(dev.ifStartListen){
      listener.start();
    }
  },
  
  async findNaturlImage() {
    await this.findFeaturePoints();    //找到初始角点
    await this.tracking();             //特征点跟踪
  },

  findFeaturePoints: function(){

  },
  
  tracking: function(){

  },

  setBackImage() {
    let geometry = new THREE.PlaneGeometry(cameraConfig.frame.width, cameraConfig.frame.height); //矩形平面
    let texture = new THREE.DataTexture(cameraConfig.frame.data, cameraConfig.frame.width, cameraConfig.frame.height, THREE.RGBAFormat);

    //texture.needsUpdate = true; //纹理更新，作用存疑，似乎是正作用
    let tex_material = new THREE.MeshPhongMaterial({
      map: texture,         // 设置纹理贴图
      side: THREE.DoubleSide
    });
    geometry.translate(cameraConfig.frame.width / 2, cameraConfig.frame.height / 2, 0);
    geometry.rotateX(Math.PI);
    let mesh = new THREE.Mesh(geometry, tex_material);
    scene.add(mesh);
    renderer.render(scene, camera);
  },

  handleFrame() {
    this.findNaturlImage();
    this.setBackImage();

    cameraConfig.flag = true;    //每一帧图像处理完成，标志位更新，继续获取下一帧
  },
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
      });
  },
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