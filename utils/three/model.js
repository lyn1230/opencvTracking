const {
    registerFBXLoader
} = require("./FBXLoader_new.js");
const {
    OrbitControls
} = require("./OrbitControls_new.js");


let container, stats, controls;

function fbxModelLoad(canvas, animationUrl, THREE, w, h, callback) {
    if (!/.fbx/i.test(animationUrl)) {
        return;
    }
    let play_type = 1;
    registerFBXLoader(THREE);
    //   resisterColladaLoader(THREE);
    let camera, scene, renderer, light;
    let frame = 0;
    let clock = new THREE.Clock();
    let mixers = [];
    var model;
    var actions, activeAction;
    var animationUrlSpecial, tempObj = null;
    var canmeraConfig = {
        cameraFov: 45,
        cameraNear: 1,
        cameraFar: 1000,
        position_x: 0,
        position_y: 0,
        position_z: 500,
        lookAt_x: 0,
        lookAt_y: 0,
        lookAt_z: 0
    };




    animationUrlSpecial = /(.+)\.fbx/i.exec(animationUrl.slice(animationUrl.lastIndexOf("/") + 1))[1];
    if (animationUrlSpecial == "sd_laoweng") {
        tempObj = {
            position_y: 100
        };
    } else if (animationUrlSpecial == "duanwu") {
        tempObj = {
            cameraFar: 2000,
            position_x: 1100,
            position_y: 1100,
            position_z: 1100
        };
    } else if (animationUrlSpecial == "xiaoyu") {
        tempObj = {
            cameraFov: 20,
            position_x: 300
        };
    } else if (animationUrlSpecial == "c_nvhai") {
        tempObj = {
            cameraFov: 65
        };
    } else if (animationUrlSpecial == "fuzhu") {
        tempObj = {
            cameraFov: 4,
            position_z: 28,
        };
    } else if (animationUrlSpecial == "Suchominus-Animation") {
        tempObj = {
            cameraFov: 90,
            cameraFar: 2000,
            position_x: -700,
            position_z: 800
        };
    }
    Object.assign(canmeraConfig, tempObj);
    // camera = new THREE.PerspectiveCamera(40, w / h, 0.01, 1000);
    // camera.position.set(canmeraConfig.position_x, canmeraConfig.position_y, 0);
    // camera = new THREE.PerspectiveCamera(canmeraConfig.cameraFov, w / h, canmeraConfig.cameraNear, canmeraConfig.cameraFar);
    camera = new THREE.PerspectiveCamera(canmeraConfig.cameraFov, w / h, 0.01, canmeraConfig.cameraFar);

    camera.position.set(canmeraConfig.position_x, canmeraConfig.position_y, canmeraConfig.position_z);

    // camera.lookAt(new THREE.Vector3(canmeraConfig.lookAt_x, canmeraConfig.lookAt_y, canmeraConfig.lookAt_z));
    camera.lookAt({
        x: 0,
        y: 0,
        z: 0
    });

    scene = new THREE.Scene();
    light = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    light.position.set(0, 1, 0);
    scene.add(light);
    light = new THREE.DirectionalLight(0xffffff, 1.0);
    light.position.set(0, 1, 0);
    scene.add(light);
    // var geometry = new THREE.CubeGeometry(1, 1, 1);
    // // 添加three自带的最简单的一种材质
    // var material = new THREE.MeshBasicMaterial({
    //     color: 0xff0000,
    // });
    //     let mesh = new THREE.Mesh(geometry, material);
    //     mesh.scale.set(0.1, 0.1, 0.1)
    //         model.add(mesh);        
    // scene.add(model);
    //             model.position.x = 1;
    //             model.position.y =0;
    //             model.position.z = 0;



    let onError = function (xhr) {
        console.log(xhr);
    };
    let manager = new THREE.LoadingManager();
    var loader = new THREE.FBXLoader(manager);
    try {
        loader.load(animationUrl, function (fbx) {
            model = fbx;



            //加网格
            var geometry = new THREE.PlaneGeometry(10, 10, 10, 10)
            var material = new THREE.MeshBasicMaterial({
                wireframe: true
            })
            var mesh1 = new THREE.Mesh(geometry, material);
            mesh1.name = "mesh"
            model.add(mesh1);

            scene.add(model);



            model.scale.x = 0.05;
            model.scale.y = 0.05;
            model.scale.z = 0.05;

            model.position.x = 0.5;
            model.position.y = -0.5;
            model.position.z = 0;

            // var axes = new THREE.AxesHelper(90);
            // model.add(axes);
            // scene.add(axes);
            fbx.mixer = new THREE.AnimationMixer(fbx);
            mixers.push(fbx.mixer);
            if (fbx.animations.length != 0) {
                console.log("have animation");
                var action = fbx.mixer.clipAction(fbx.animations[0]);
                action.setEffectiveTimeScale(0.8).play();
            }
            // wx.hideLoading();  
            callback(model);
        }, undefined, onError);
    } catch (e) {
        console.log(e);
    }
    renderer = new THREE.WebGLRenderer({
        alpha: true
    });

    renderer.setClearAlpha(0);
    renderer.setPixelRatio(wx.getSystemInfoSync().pixelRatio);
    renderer.setSize(w, h);
    renderer.gammaOutput = true;
    renderer.gammaFactor = 2.2;

    controls = new OrbitControls(camera, renderer.domElement);
    controls.update();
    animate();


    //three.js播放动画
    function animate() {
        canvas.requestAnimationFrame(animate);
        if (mixers.length > 0) {
            for (let i = 0; i < mixers.length; i++) {
                let delta = clock.getDelta();
                mixers[i].update(delta);
                frame = frame + delta;
                if (play_type == 0) {
                    if (frame > 0.01) {
                        let estop = new Event("estop");
                        document.dispatchEvent(estop);
                        play_type = -1;
                    }
                }
            }
        }
        render();
    }

    //three.js动画渲染
    function render() {
        renderer.render(scene, camera);
    }
}


module.exports = {
    fbxModelLoad: fbxModelLoad
}