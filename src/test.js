import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import './style.css'
import * as maplibregl from 'maplibre-gl'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import * as dat from 'dat.gui'

var webGLCompatibility = WebGL.isWebGLAvailable()
if (webGLCompatibility) {
  const initialAnimationDuration = 5000 * 4
  let animationDuration = initialAnimationDuration
  const label = {
    model: '',
    mixer: '',
    animationIncrement: 0,
    animationClip: '',
    text: 'LAHORE',
    textSize: 0.25,
    textHeight: 0.03
  }
  const marker = {
    model: '',
    mixer: '',
    animationIncrement: 0,
    animationClip: ''
  }
  const plane = {
    model: undefined,
    mixer: '',
    animationIncrement: 0,
    animationClip: ''
  }
  const runway = {
    model: undefined,
    mixer: '',
    animationIncrement: 0,
    animationClip: ''
  }
  let animationStartTime,
    renderer,
    model,
    scene,
    camera,
    numberPosition,
    rendererRunway,
    sceneRunway,
    cameraRunway,
    rendererLabel,
    sceneLabel,
    cameraLabel,
    rendererMarker,
    sceneMarker,
    cameraMarker
  let initialModelCoords, newModelCoords
  let cityTextMesh, planeInScene, cubeTexture
  let screenWidth = window.innerWidth
  let screenHeight = window.innerHeight
  let guiDebug = new dat.GUI()
  const dracoLoader = new DRACOLoader()
  const fontLoader = new FontLoader()

  let modelOrigin = [74.40343593367185, 31.520404025284762]
  let target = modelOrigin
  const modelAltitude = 0
  const modelRotate = [Math.PI / 2, -Math.PI / 2, 0]
  let initialZoom = 17
  let modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    modelOrigin,
    modelAltitude
  )
  let initialScale
  initialScale = modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 90
  let maxAltitude = 0.000001

  const createModelTransform = scaleMultiplier => ({
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    scale: initialScale * scaleMultiplier
    // scale: initialScale * scaleMultiplier
  })

  const modelTransform = createModelTransform(0.7)
  const modelTransformRunway = createModelTransform(0.9)
  const modelTransformLabel = createModelTransform(1)
  const modelTransformMarker = createModelTransform(1)

  const planeLights = []

  const map = (window.map = new maplibregl.Map({
    container: 'map',
    style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    //style: 'https://map.vizualtravel.com/styles/osm-bright-gl-style/style.json',
    zoom: initialZoom,
    center: modelOrigin,
    pitch: 55,
    bearing: 42,
    antialias: true
  }))

  let startSpeeding = false
  // Automatic scalling on the basis of zoom level
  map.on('zoom', () => {
    const currentZoom = map.getZoom()
    const scaleFactor = Math.pow(2, currentZoom - initialZoom)

    const scale1 = initialScale / scaleFactor / 3
    const scale2 = initialScale / scaleFactor / 2
    const scale3 = initialScale / scaleFactor / 1

    const interpolatedScale =
      currentZoom <= 6
        ? THREE.MathUtils.lerp(0, scale1, currentZoom / 6)
        : currentZoom <= 10
        ? THREE.MathUtils.lerp(scale1, scale2, (currentZoom - 6) / 4)
        : THREE.MathUtils.lerp(scale2, scale3, (currentZoom - 10) / 20)

    modelTransform.scale = interpolatedScale

    // const minDuration = (5000) * 4;
    // const maxDuration = (5000000) * 4;
    // let intervalSize;
    // if(currentZoom >=3 && currentZoom < 4){
    //     animationDuration = minDuration;
    // }else if(currentZoom > 16 && currentZoom <= 17){
    //     animationDuration = maxDuration;
    // }
    // intervalSize = (maxDuration - minDuration) / 14;
    //animationDuration = THREE.MathUtils.lerp(minDuration, maxDuration, Math.min(currentZoom / 17, 1));
    // const adjustedAnimationDuration = calculateAnimationDuration(currentZoom);

    // animationDuration = adjustedAnimationDuration;

    // console.log(currentZoom, animationDuration);
  })
  const geojson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          coordinates: [
            [74.40343593367185, 31.520404025284762],

            [74.40343593367185, -70.41202624189884]
          ],
          type: 'LineString'
        }
      }
    ]
  }

  //model Loaders

  new RGBELoader()
    .setPath('./textures/')
    // .load('fouriesburg_mountain_lookout_2_1k (1).hdr', function (texture) {
    // .load('steinbach_field_1k.hdr', function (texture) {
    // .load('bismarckturm_1k.hdr', function (texture) {
    // .load('spree_bank_1k.hdr', function (texture) {
    // .load('roofless_ruins_1k.hdr', function (texture) {
    .load('dam_road_1k.hdr', function (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping
      texture.flipY = false
      cubeTexture = texture
      loadModels()
    })

  dracoLoader.setDecoderPath('/loader/dracoGltf/')
  const loader = new GLTFLoader()
  // loader.setDRACOLoader(dracoLoader)

  function runwayLoader () {
    loader.load('/models/runway.glb', gltf => {
      runway.model = gltf.scene
      if (gltf.animations && gltf.animations.length > 0) {
        runway.mixer = new THREE.AnimationMixer(runway.model)
        const clips = gltf.animations

        runway.appearingRunwayClip = THREE.AnimationClip.findByName(
          clips,
          'appearing_runway'
        )
        runway.appearingRunwayAction = runway.mixer.clipAction(
          runway.appearingRunwayClip
        )
        runway.appearingRunwayAction.loop = THREE.LoopOnce

        const idleRunwayClip = THREE.AnimationClip.findByName(
          clips,
          'idle_full_runway'
        )
        runway.idleRunwayAction = runway.mixer.clipAction(idleRunwayClip)
        runway.idleRunwayAction.loop = THREE.LoopOnce

        const disappearRunwayClip = THREE.AnimationClip.findByName(
          clips,
          'disappearing_runway'
        )
        runway.disappearRunwayAction =
          runway.mixer.clipAction(disappearRunwayClip)
        runway.disappearRunwayAction.loop = THREE.LoopOnce

        runway.mixer.addEventListener('finished', function (e) {
          if (e.action._clip.name === 'appearing_runway') {
            runway.idleRunwayAction.reset()
            runway.idleRunwayAction.play()
          } else if (e.action._clip.name === 'idle_full_runway') {
            runway.disappearRunwayAction.reset()
            runway.disappearRunwayAction.play()
          } else if (e.action._clip.name === 'disappearing_runway') {
            runway.stopAnimation = true
          }
        })
      }
      runway.model.traverse(child => {
        if (child.isMesh) {
          const material = child.material
          if (material) {
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.03;
            material.metalness = 0
            material.roughness = 0
          }
        }
      })
      let cood = geojson.features[0].geometry.coordinates
      let i = maplibregl.MercatorCoordinate.fromLngLat(cood[0], modelAltitude)
      let n = maplibregl.MercatorCoordinate.fromLngLat(
        cood[cood.length - 1],
        modelAltitude
      )

      let rotate = calcPointRotation(i, n, 3)
      runway.model.rotation.set(0, rotate.y, 0)
      //new Model

      // if (gltf.animations && gltf.animations.length > 0) {
      //     runway.mixer = new THREE.AnimationMixer(runway.model);
      //     const clips = gltf.animations;

      //     runway.appearingRunwayClip = THREE.AnimationClip.findByName(clips, "runway_appearing_animation");
      //     runway.appearingRunwayAction = runway.mixer.clipAction(runway.appearingRunwayClip);
      //     runway.appearingRunwayAction.loop = THREE.LoopOnce;

      //     const idleRunwayClip = THREE.AnimationClip.findByName(clips, "runway_scale_1");
      //     runway.idleRunwayAction = runway.mixer.clipAction(idleRunwayClip);
      //     runway.idleRunwayAction.loop = THREE.LoopOnce;

      //     const disappearRunwayClip = THREE.AnimationClip.findByName(clips, "runway_disappearing_animation");
      //     runway.disappearRunwayAction = runway.mixer.clipAction(disappearRunwayClip);
      //     runway.disappearRunwayAction.loop = THREE.LoopOnce;

      //     runway.mixer.addEventListener('finished', function (e) {
      //         if (e.action._clip.name === "runway_appearing_animation") {
      //             runway.idleRunwayAction.reset();
      //             runway.idleRunwayAction.play();
      //         } else if (e.action._clip.name === "runway_scale_1") {
      //             runway.disappearRunwayAction.reset();
      //             runway.disappearRunwayAction.play();
      //         } else if (e.action._clip.name === "runway_disappearing_animation") {
      //             runway.stopAnimation = true;
      //         }
      //     })
      // }
      // runway.model.traverse((child) => {
      //     if (child.isMesh) {
      //         const material = child.material;
      //         if (material) {
      //             material.metalness = 0;
      //             material.roughness = 0;
      //         }
      //     }
      // });
      // let cood = geojson.features[0].geometry.coordinates;
      // let i = maplibregl.MercatorCoordinate.fromLngLat(cood[0], modelAltitude);
      // let n = maplibregl.MercatorCoordinate.fromLngLat(cood[cood.length - 1], modelAltitude);

      // let rotate = calcPointRotation(i, n, 3);
      // runway.model.rotation.set(0, rotate.y, 0);
    })
  }

  function planeLoader () {
    loader.load('/models/newModels/plane.glb', gltf => {
      plane.model = gltf.scene
      if (gltf.animations && gltf.animations.length > 0) {
        plane.mixer = new THREE.AnimationMixer(plane.model)
        const clips = gltf.animations

        plane.appearingPlaneClip = THREE.AnimationClip.findByName(
          clips,
          'plane_appearing_animation'
        )
        plane.appearingPlaneAction = plane.mixer.clipAction(
          plane.appearingPlaneClip
        )
        plane.appearingPlaneAction.loop = THREE.LoopOnce
        plane.appearingPlaneAction.clampWhenFinished = true

        const idlePlaneClip = THREE.AnimationClip.findByName(
          clips,
          'plane_idle_scale_1'
        )
        plane.idlePlaneAction = plane.mixer.clipAction(idlePlaneClip)
        plane.idlePlaneAction.loop = THREE.LoopOnce

        plane.wheelsUpClip = THREE.AnimationClip.findByName(
          clips,
          'plane_wheels_going_up'
        )
        plane.wheelsUpAction = plane.mixer.clipAction(plane.wheelsUpClip)
        plane.wheelsUpAction.loop = THREE.LoopOnce
        plane.wheelsUpAction.clampWhenFinished = true

        plane.wheelsDownClip = THREE.AnimationClip.findByName(
          clips,
          'plane_wheels_going_down'
        )
        plane.wheelsDownAction = plane.mixer.clipAction(plane.wheelsDownClip)
        plane.wheelsDownAction.loop = THREE.LoopOnce
        plane.wheelsDownAction.clampWhenFinished = true

        plane.disappearingPlaneClip = THREE.AnimationClip.findByName(
          clips,
          'plane_disappearing_animation'
        )
        plane.disappearingPlaneAction = plane.mixer.clipAction(
          plane.disappearingPlaneClip
        )
        plane.disappearingPlaneAction.loop = THREE.LoopOnce

        plane.mixer.addEventListener('finished', function (e) {
          if (e.action._clip.name === 'plane_appearing_animation') {
            plane.idlePlaneAction.reset()
            // plane.idlePlaneAction.setEffectiveTimeScale(0.05);
            plane.idlePlaneAction.play()
          }
          // else if (e.action._clip.name === "plane_idle_scale_1") {
          //     plane.wheelsUpAction.reset();
          //     // plane.wheelsUpAction.setEffectiveTimeScale(3.0);
          //     plane.wheelsUpAction.play();
          // }
          else if (e.action._clip.name === 'plane_disappearing_animation') {
            scene.remove(plane.group)
            planeInScene = false
            plane.stopAnimation = true
          }
        })
      }

      plane.model.traverse(child => {
        if (child.isMesh) {
          const material = child.material
          if (material) {
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.02;
            material.envMap = cubeTexture
            material.envMapIntensity = 0.1
            material.metalness = 0
            material.roughness = 0
          }
        }
      })
      let cood = geojson.features[0].geometry.coordinates
      let i = maplibregl.MercatorCoordinate.fromLngLat(cood[0], modelAltitude)
      let n = maplibregl.MercatorCoordinate.fromLngLat(
        cood[cood.length - 1],
        modelAltitude
      )

      let rotate = calcPointRotation(i, n, 4)
      plane.group = new THREE.Group()
      plane.model.position.set(0, 0.25, 1.9)
      plane.group.rotation.set(0, rotate.y, 0)
      plane.group.add(plane.model)
      //   scene.add(plane.model)
    })
  }

  function markerLoader () {
    loader.load('/models/newModels/marker.glb', gltf => {
      marker.model = gltf.scene

      if (gltf.animations && gltf.animations.length > 0) {
        marker.mixer = new THREE.AnimationMixer(marker.model)
        const clips = gltf.animations
        marker.appearingMarkerClip = THREE.AnimationClip.findByName(
          clips,
          'marker_appearing_animation'
        )
        marker.appearingMarkerAction = marker.mixer.clipAction(
          marker.appearingMarkerClip
        )
        marker.appearingMarkerAction.loop = THREE.LoopOnce

        marker.idleMarkerClip = THREE.AnimationClip.findByName(
          clips,
          'marker_idle_scale_1'
        )
        marker.idleMarkerAction = marker.mixer.clipAction(marker.idleMarkerClip)
        marker.idleMarkerAction.loop = THREE.LoopOnce

        marker.disappearMarkerClip = THREE.AnimationClip.findByName(
          clips,
          'marker_disappearing_animation'
        )
        marker.disappearMarkerAction = marker.mixer.clipAction(
          marker.disappearMarkerClip
        )
        marker.disappearMarkerAction.loop = THREE.LoopOnce

        marker.mixer.addEventListener('finished', function (e) {
          if (e.action._clip.name === 'marker_appearing_animation') {
            marker.idleMarkerAction.reset()
            marker.idleMarkerAction.play()
          } else if (e.action._clip.name === 'marker_idle_scale_1') {
            marker.disappearMarkerAction.reset()
            marker.disappearMarkerAction.play()
          } else if (e.action._clip.name === 'marker_disappearing_animation') {
            marker.stopAnimation = true
          }
        })
        // marker.animationClip = THREE.AnimationClip.findByName(clips, "Cylinder|Cylinder|Action");
        // marker.action = marker.mixer.clipAction(marker.animationClip);
        // marker.action.play();
        // marker.action.loop = THREE.LoopOnce;
      }
      marker.model.traverse(child => {
        if (child.isMesh) {
          const material = child.material
          child.castShadow = true

          if (material) {
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.0885;
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.04;
            material.envMap = cubeTexture
            material.envMapIntensity = 0.08
            material.metalness = 0
            material.roughness = 0
            // material.color = new THREE.Color('red')
          }
        }
      })

      marker.model.position.set(0, 0.4, -0.25)
      scene.add(marker.model)
    })
  }

  function labelLoader (params) {
    loader.load('/models/label.glb', gltf => {
      label.model = gltf.scene
      if (gltf.animations && gltf.animations.length > 0) {
        label.mixer = new THREE.AnimationMixer(label.model)
        const clips = gltf.animations

        // label.appearingLabelClip = THREE.AnimationClip.findByName(clips, "label_appearing_animation");
        // label.appearingLabelAction = marker.mixer.clipAction(label.appearingLabelClip);
        // label.appearingLabelAction.loop = THREE.LoopOnce;

        // label.idleLabelClip = THREE.AnimationClip.findByName(clips, "label_idle_scale_1");
        // label.idleLabelAction = marker.mixer.clipAction(label.idleLabelClip);
        // label.idleLabelAction.loop = THREE.LoopOnce;

        // label.disappearLabelClip = THREE.AnimationClip.findByName(clips, "label_disappearing_animation");
        // label.disappearLabelAction = marker.mixer.clipAction(label.disappearLabelClip);
        // label.disappearLabelAction.loop = THREE.LoopOnce;

        // label.mixer.addEventListener('finished', function (e) {
        //     if (e.action._clip.name === "label_appearing_animation") {
        //         label.idleLabelAction.reset();
        //         label.idleLabelAction.play();
        //     } else if (e.action._clip.name === "label_idle_scale_1") {
        //         label.disappearLabelAction.reset();
        //         label.disappearLabelAction.play();
        //     } else if (e.action._clip.name === "label_disappearing_animation") {
        //         label.stopAnimation = true;
        //     }
        // })

        label.animationClip = THREE.AnimationClip.findByName(
          clips,
          'Cube.001Action.002'
        )
        label.action = label.mixer.clipAction(label.animationClip)
        //label.action.play();
        label.action.loop = THREE.LoopOnce
      }
      label.model.traverse(child => {
        if (child.isMesh) {
          const material = child.material
          child.receiveShadow = true
          if (material) {
            // material.envMap = cubeTexture
            // material.envMapIntensity = 0.45
            // material.color = new THREE.Color(0xd66b00);0xd07b4c;0xf3713d
            // material.color = new THREE.Color(0xd07b4c);
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.04;
            material.color = new THREE.Color(0xd66b00)
            material.metalness = 0
            material.roughness = 0
          }
        }
      })
      label.model.position.set(0, 0.3, 0)
      scene.add(label.model)
      function addLineBreaks (inputString, charactersPerLine) {
        if (
          typeof inputString !== 'string' ||
          typeof charactersPerLine !== 'number' ||
          charactersPerLine <= 0
        ) {
          return inputString
        }
        let result = ''
        for (let i = 0; i < inputString.length; i++) {
          result += inputString[i]
          if ((i + 1) % charactersPerLine === 0 && i !== 0) {
            result += '\n'
          }
        }
        return result
      }

      const maxLen = 30

      label.text = addLineBreaks(label.text, maxLen)

      if (label.text.length <= 12) {
        label.textHeight = 0.03
        label.textSize = 0.25
      } else if (label.text.length >= 90) {
        label.textHeight = 0.01
        label.textSize = 0.1
      } else {
        const lengthDifference = label.text.length - 12
        const heightDecreaseRate = 0.03 / 78
        const sizeDecreaseRate = (0.25 - 0.1) / 78
        label.textHeight = 0.03 - lengthDifference * heightDecreaseRate
        if (label.text.length <= 30) {
          label.textSize = 0.25 - lengthDifference * (sizeDecreaseRate * 5)
        } else if (label.text.length > 30 && label.text.length <= 36) {
          label.textSize = 0.25 - lengthDifference * (sizeDecreaseRate * 4)
        } else if (label.text.length > 36 && label.text.length <= 42) {
          label.textSize = 0.25 - lengthDifference * (sizeDecreaseRate * 3)
        } else if (label.text.length > 42 && label.text.length <= 55) {
          label.textSize = 0.25 - lengthDifference * (sizeDecreaseRate * 2)
        } else if (label.text.length > 55 && label.text.length <= 70) {
          label.textSize = 0.25 - lengthDifference * (sizeDecreaseRate * 1.5)
        } else {
          label.textSize = 0.25 - lengthDifference * (sizeDecreaseRate * 1.3)
        }
      }

      fontLoader.load(
        'https://threejs.org/examples/fonts/helvetiker_regular.typeface.json',
        font => {
          const textGeometry = new TextGeometry(label.text, {
            font: font,
            size: label.textSize,
            height: label.textHeight
          })

          const textMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff })

          cityTextMesh = new THREE.Mesh(textGeometry, textMaterial)
          textGeometry.center()
          cityTextMesh.rotation.set(-Math.PI / 2, 0, 0)
          cityTextMesh.position.set(0, 0.013, 0)
          label.model.add(cityTextMesh)
          let cood = geojson.features[0].geometry.coordinates
          let i = maplibregl.MercatorCoordinate.fromLngLat(
            cood[0],
            modelAltitude
          )
          let n = maplibregl.MercatorCoordinate.fromLngLat(
            cood[cood.length - 1],
            modelAltitude
          )

          let rotate = calcPointRotation(i, n, 3)
          label.model.rotation.set(0, rotate.y, 0)
          if (params == 'destination') {
            animateLabel('end')
          }
        }
      )
    })
  }

  function lightHelpers () {
    planeLights.forEach(val => {
      const helper = new THREE.DirectionalLightHelper(val)
      scene.add(helper)
    })
  }
  // map custom layers
  const createLayer = (id, val, modelTransform) => ({
    id,
    type: 'custom',
    renderingMode: '3d',
    onAdd (map, gl) {
      this.camera = new THREE.Camera()
      this.scene = new THREE.Scene()

      const lights = [
        [-7, 8, -1],
        [4, 3, -1],
        [-135, 80, 80],
        [135, 80, -80]
        // [0,1,0],
        // [140, 130, -10]
        // [5000, 5000, 5000],
        // [-30, 40, 30],
      ]

      //   lights.forEach(position => {
      //     const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
      //     directionalLight.position.set(...position)

      //     // if (directionalLight.position.x == 40) {
      //     //     if (val === 'Plane') {
      //     //         this.scene.add(directionalLight);
      //     //     }
      //     // }
      //     // else if (directionalLight.position.x == 5000) {

      //     //     if (val === 'Plane') {
      //     //         directionalLight.intensity = 4;
      //     //     }
      //     //     this.scene.add(directionalLight);
      //     // }
      //     // else {
      //     if (val == 'Label' && directionalLight.position.x !== 0) {
      //       directionalLight.intensity = 0.82
      //       directionalLight.position.set(0, 1, 0)
      //       //   this.scene.add(directionalLight) ******
      //     } else if (val === 'Plane') {
      //       if (directionalLight.position.x == 4) {
      //         directionalLight.color = new THREE.Color(0xdedede)
      //         directionalLight.position.set(10000, 10000, 10000)
      //         directionalLight.intensity = 4.5
      //       }
      //       //   this.scene.add(directionalLight)
      //       //directionalLight.position.set(0, 1, 0);
      //       //this.scene.add(directionalLight);
      //     }
      //     // }

      //     if (val === 'Plane') {
      //       planeLights.push(directionalLight)
      //     }
      //   })
      //   const ambientLight = new THREE.AmbientLight(0xffffff)
      //   if (val === 'Label') {
      //     ambientLight.intensity = 3
      //   } else if (val === 'Marker') {
      //     ambientLight.intensity = 2.0
      //     // this.scene.add(ambientLight) ******
      //   } else if (val === 'Runway') {
      //     ambientLight.intensity = 4.5
      //     // this.scene.add(ambientLight) ******
      //   } else {
      //     //planeLights.push(ambientLight);
      //     ambientLight.intensity = 2.6
      //   }
      // this.scene.add(ambientLight);

      const _ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
      this.scene.add(_ambientLight)

      const lightProbe = new THREE.LightProbe()

      const geometry = new THREE.PlaneGeometry(2000, 2000)
      geometry.rotateX(-Math.PI / 2)

      const material = new THREE.ShadowMaterial()
      material.opacity = 0.2

      const plane = new THREE.Mesh(geometry, material)
      plane.position.y = 0.3
      plane.receiveShadow = true
      // this.scene.add(plane)

      // this.scene.add(lightProbe)

      // Directional light
      //   const _directionalLight = new THREE.DirectionalLight(0xffffff, 2.5)
      //   _directionalLight.castShadow = true
      //   _directionalLight.position.set(0, 10, -20)
      //   this.scene.add(_directionalLight)

      //   //   _directionalLight.shadow.mapSize.width = 256
      //   //   _directionalLight.shadow.mapSize.height = 256
      //   //   _directionalLight.shadow.camera.near = 0.5
      //   //   _directionalLight.shadow.camera.far = 25
      //   //   _directionalLight.shadow.camera.left = -10
      //   //   _directionalLight.shadow.camera.right = 10
      //   //   _directionalLight.shadow.camera.top = 10
      //   //   _directionalLight.shadow.camera.bottom = -10
      //   //   _directionalLight.shadow.radius = 5
      //   //   _directionalLight.shadow.blurSamples = 25
      //   const diractionLightHelper = new THREE.DirectionalLightHelper(
      //     _directionalLight,
      //     0.5,
      //     'red'
      //   )
      //   this.scene.add(diractionLightHelper)
      // this.scene.environment = cubeTexture
      // this.scene.background = cubeTexture
      // this.scene.backgroundBlurriness = 0.5

      let lightGroup = new THREE.Group()
      const topDirectionalLight = new THREE.DirectionalLight('white', 1.6) //0.7
      topDirectionalLight.position.set(10, 100000, -200)
      const topDirectionalLightHelper = new THREE.DirectionalLightHelper(
        topDirectionalLight,
        0.5,
        'yellow'
      )
      // lightGroup.add(topDirectionalLight)
      lightGroup.add(topDirectionalLight.target)
      // this.scene.add(topDirectionalLightHelper)

      const leftDirectionalLight = new THREE.DirectionalLight('#F5F5F5', 1.6)
      leftDirectionalLight.position.set(-1000, 1000, 0)
      leftDirectionalLight.castShadow = true
      // leftDirectionalLight.target.position.set(0, -0.6, 0.4);
      const leftDirectionalLightHelper = new THREE.DirectionalLightHelper(
        leftDirectionalLight,
        0.5,
        'orange'
      )
      lightGroup.add(leftDirectionalLight)
      lightGroup.add(leftDirectionalLight.target)
      // this.scene.add(leftDirectionalLightHelper)

      const rightDirectionalLight = new THREE.DirectionalLight('#F5F5F5', 1.6)
      rightDirectionalLight.position.set(1000, 1000, 0)
      rightDirectionalLight.castShadow = true
      // rightDirectionalLight.target.position.set(0, -1.5, 0);
      const rightDirectionalLightHelper = new THREE.DirectionalLightHelper(
        rightDirectionalLight,
        0.5,
        'blue'
      )
      lightGroup.add(rightDirectionalLight)
      lightGroup.add(rightDirectionalLight.target)
      // this.scene.add(rightDirectionalLightHelper)

      const backDirectionalLight = new THREE.DirectionalLight('#F5F5F5', 1.6)
      backDirectionalLight.position.set(0, 0, 30)
      backDirectionalLight.castShadow = true
      const backDirectionalLightHelper = new THREE.DirectionalLightHelper(
        backDirectionalLight,
        0.5,
        'green'
      )
      lightGroup.add(backDirectionalLight)
      lightGroup.add(backDirectionalLight.target)
      // this.scene.add(backDirectionalLightHelper)

      const frontDirectionalLight = new THREE.DirectionalLight('#F5F5F5', 1.6)
      frontDirectionalLight.position.set(0, 10, -20)
      frontDirectionalLight.name = 'frontLight'
      frontDirectionalLight.castShadow = true
      frontDirectionalLight.shadow.mapSize.width = 2048 * 4
      frontDirectionalLight.shadow.mapSize.height = 2048 * 4
      frontDirectionalLight.shadow.camera.near = 0.5
      frontDirectionalLight.shadow.camera.far = 50
      frontDirectionalLight.shadow.camera.left = -20
      frontDirectionalLight.shadow.camera.right = 20
      frontDirectionalLight.shadow.camera.top = 190
      frontDirectionalLight.shadow.camera.bottom = -50
      frontDirectionalLight.shadow.radius = 10
      frontDirectionalLight.shadow.blurSamples = 15
      frontDirectionalLight.target.position.set(0, 0, 0)
      const frontDirectionalLightHelper = new THREE.DirectionalLightHelper(
        frontDirectionalLight,
        0.5,
        'red'
      )
      lightGroup.add(frontDirectionalLight)
      lightGroup.add(frontDirectionalLight.target)
      // lightGroup.add(frontDirectionalLightHelper)

      // this.scene.add(new THREE.AxesHelper(5))
      // group.add(lightGroup)

      this.scene.add(lightGroup)

      this.map = map

      this.renderer = new THREE.WebGLRenderer({
        canvas: map.getCanvas(),
        context: gl,
        antialias: true
      })
      this.renderer.shadowMap.enabled = true
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
      // this.renderer.toneMapping = THREE.NoToneMapping
      this.renderer.toneMappingExposure = 2
      this.renderer.autoClear = false
      this.renderer.state.reset()
      if (val === 'Plane') {
        renderer = this.renderer
        scene = this.scene
        camera = this.camera
      } else if (val === 'Runway') {
        rendererRunway = this.renderer
        sceneRunway = this.scene
        cameraRunway = this.camera
      } else if (val === 'Label') {
        rendererLabel = this.renderer
        sceneLabel = this.scene
        cameraLabel = this.camera
      } else if ('Marker') {
        rendererMarker = this.renderer
        sceneMarker = this.scene
        cameraMarker = this.camera
      }
    },
    render (gl, matrix) {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      )
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      )
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      )

      const m = new THREE.Matrix4().fromArray(matrix)
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ)

      this.camera.projectionMatrix = m.multiply(l)
      this.renderer.resetState()
      this.renderer.render(this.scene, this.camera)
      this.map.triggerRepaint()
    }
  })

  const planeLayer = createLayer('plane', 'Plane', modelTransform)
  const runwayLayer = createLayer('runway', 'Runway', modelTransformRunway)
  const labelLayer = createLayer('label', 'Label', modelTransformLabel)
  const markerLayer = createLayer('marker', 'Marker', modelTransformMarker)

  function loadModels () {
    markerLoader()
    labelLoader()
    runwayLoader()
    planeLoader()
  }

  function lerp (start, end, t) {
    return start * (1 - t) + end * t
  }

  function dynamicScalling () {
    const highResValues = {
      initialScale:
        modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 90,
      maxAltitude: 0.00001,
      initialZoom: 17
    }

    const lowResValues = {
      initialScale:
        modelAsMercatorCoordinate.meterInMercatorCoordinateUnits() * 90,
      maxAltitude: 0.000002,
      initialZoom: 12
    }

    const t = Math.min(screenWidth / 1280, screenHeight / 1080)

    const dynamicValues = {
      initialScale: lerp(
        lowResValues.initialScale,
        highResValues.initialScale,
        t
      ),
      maxAltitude: lerp(lowResValues.maxAltitude, highResValues.maxAltitude, t),
      initialZoom: lerp(lowResValues.initialZoom, highResValues.initialZoom, t)
    }
    console.log(dynamicValues)
  }

  // window.addEventListener('resize',() => {
  //     // if(screenWidth > window.innerWidth){
  //     //     modelTransform.scale =
  //     //     modelTransformRunway.scale =
  //     //     modelTransformLabel.scale =
  //     //     modelTransformMarker.scale =
  //     // }else if(screenWidth < window.innerWidth){
  //     //     modelTransform.scale =
  //     //     modelTransformRunway.scale =
  //     //     modelTransformLabel.scale =
  //     //     modelTransformMarker.scale =
  //     // }

  //     // if(screenHeight < window.innerHeight){
  //     //     maxAltitude = maxAltitude - (window.innerHeight - screenHeight);
  //     // }else if(screenHeight > window.innerHeight){

  //     // }
  //     dynamicScalling();
  //     // screenWidth = window.innerWidth;
  //     // screenHeight = window.innerHeight;
  //     if(screenHeight <= 300){
  //         maxAltitude = 0.000002;
  //         map.setZoom(12);
  //     }
  // })

  const flyMap = () => {
    map.flyTo({
      center: target,
      zoom: initialZoom,
      essential: true
    })
  }
  flyMap()

  // animations of models
  let clock = new THREE.Clock()
  let clock2 = new THREE.Clock()

  function animateLabel (param) {
    if (param == 'start') {
      sceneLabel.add(label.model)
      label.action.reset()
      label.action.play()
      clock = new THREE.Clock()
      sceneMarker.add(marker.model)
      animateMarker('start')
    } else if (param == 'end') {
      sceneLabel.add(label.model)
      label.action.reset()
      label.action.play()
      clock = new THREE.Clock()
      sceneMarker.add(marker.model)
      animateMarker('end')
    }
    const progress = label.action.time / label.animationClip.duration
    if (label.action.time >= 0.35 && label.action.time <= 0.38) {
      label.model.add(cityTextMesh)
    } else if (label.action.time >= 2 && label.action.time <= 2.1) {
      label.model.remove(cityTextMesh)
    }
    label.mixer.update(clock.getDelta())
    if (progress >= 1) {
      label.stopAnimation = false
      sceneLabel.remove(label.model)
    } else {
      requestAnimationFrame(animateLabel)
    }
  }
  let endDestination
  function animateMarker (param) {
    if (param == 'start' || param == 'end') {
      marker.appearingMarkerAction.reset()
      marker.appearingMarkerAction.play()
      clock2 = new THREE.Clock()
      endDestination = param
    }
    marker.mixer.update(clock2.getDelta())
    // const progress = marker.action.time / marker.animationClip.duration;
    if (marker.stopAnimation) {
      marker.stopAnimation = false
      sceneMarker.remove(marker.model)
      if (endDestination != 'end') {
        scene.add(plane.group)
        sceneRunway.add(runway.model)
        animateRunway('start')
        addPlane('start')
      } else {
        location.reload()
      }
    } else {
      requestAnimationFrame(animateMarker)
    }
  }

  function animateRunway (param) {
    if (param == 'start') {
      runway.appearingRunwayAction.reset()
      runway.appearingRunwayAction.play()
      clock = new THREE.Clock()
    }
    runway.mixer.update(clock.getDelta())
    if (runway.stopAnimation) {
      runway.stopAnimation = false
      sceneRunway.remove(runway.model)
    } else {
      requestAnimationFrame(animateRunway)
    }
  }
  let animationPlaneTime

  let planeMovementClock = new THREE.Clock()
  let speed = 0
  function addPlane (param) {
    if (param == 'start') {
      plane.appearingPlaneAction.reset()
      plane.appearingPlaneAction.play()
      clock2 = new THREE.Clock()
      planeMovementClock = new THREE.Clock()
      animationPlaneTime = Date.now()
    }
    plane.mixer.update(clock2.getDelta())

    if (plane.model.position.z > 0) {
      if (
        runway.appearingRunwayAction.time >=
        runway.appearingRunwayClip.duration - 0.5
      ) {
        speed += 0.18
        plane.model.position.z -= (planeMovementClock.getDelta() * speed) / 4
      }
      requestAnimationFrame(addPlane)
    } else {
      setTimeout(() => {
        planeInScene = true
        // animateLights()
      }, 1000)
      plane.wheelsUpAction.reset()
      plane.wheelsUpAction.play()
      animateModel()
    }
  }
  function calcPointRotation (newCoods, initialCoods, progressRotation) {
    const deltaX = newCoods.x - initialCoods.x
    const deltaY = newCoods.y - initialCoods.y
    const rotationY = Math.atan2(deltaX, deltaY)

    const angleDiff = rotationY - modelTransform.rotateY
    let multipleRotation = 1

    const shortestAngle = ((angleDiff + Math.PI) % (Math.PI * 2)) - Math.PI
    const startRotation = new THREE.Euler(0, modelTransform.rotateY, 0)
    const endRotation = new THREE.Euler(
      0,
      modelTransform.rotateY + shortestAngle,
      0
    )

    const interpolatedRotation = new THREE.Euler()
    interpolatedRotation.x = THREE.MathUtils.lerp(
      startRotation.x,
      endRotation.x,
      progressRotation * multipleRotation
    )
    interpolatedRotation.y = THREE.MathUtils.lerp(
      startRotation.y,
      endRotation.y,
      progressRotation * multipleRotation
    )
    interpolatedRotation.z = THREE.MathUtils.lerp(
      startRotation.z,
      endRotation.z,
      progressRotation * multipleRotation
    )

    return interpolatedRotation
  }

  // ending Animations
  function endPlaneAnimation (params) {
    if (params == 'endPlane') {
      clock2 = new THREE.Clock()
      plane.disappearingPlaneAction.reset()
      plane.disappearingPlaneAction.play()
    }

    plane.mixer.update(clock2.getDelta())
    if (plane.stopAnimation) {
      plane.stopAnimation = false
      endRunwayAnimation('endRunway')
    } else {
      requestAnimationFrame(endPlaneAnimation)
    }
  }
  function endRunwayAnimation (params) {
    if (params == 'endRunway') {
      runway.disappearRunwayAction.reset()
      runway.disappearRunwayAction.play()
    }
    runway.mixer.update(clock2.getDelta())
    if (runway.stopAnimation) {
      runway.stopAnimation = false
      sceneRunway.remove(runway.model)
      addDestinationLabel('ANTARCTICA')
    } else {
      requestAnimationFrame(endRunwayAnimation)
    }
  }

  function addDestinationLabel (name) {
    label.text = name
    labelLoader('destination')
  }

  function movePlane (params) {
    if (params == 'start') {
      planeMovementClock = new THREE.Clock()
    }

    if (plane.model.position.z > -1.9 && speed > 0) {
      speed -= 0.18
      console.log(speed)
      plane.model.position.z -= (planeMovementClock.getDelta() * speed) / 4
      requestAnimationFrame(movePlane)
    } else {
      startedAnim = false
      endPlaneAnimation('endPlane')
    }
  }

  let startedAnim = false
  let progressVal = 0
  function customEasing (t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
  }
  function animateModel () {
    if (!animationStartTime) {
      numberPosition = 0
      initialModelCoords = maplibregl.MercatorCoordinate.fromLngLat(
        modelOrigin,
        modelAltitude
      )
      newModelCoords = maplibregl.MercatorCoordinate.fromLngLat(
        geojson.features[0].geometry.coordinates[numberPosition + 1],
        modelAltitude
      )
      animationStartTime = Date.now()
    }
    const elapsedTime = Date.now() - animationStartTime
    progressVal = Math.min(elapsedTime / animationDuration, 1)
    const progress = customEasing(progressVal)

    const interpolatedX = THREE.MathUtils.lerp(
      initialModelCoords.x,
      newModelCoords.x,
      progress
    )
    const interpolatedY = THREE.MathUtils.lerp(
      initialModelCoords.y,
      newModelCoords.y,
      progress
    )
    const interpolatedZ = THREE.MathUtils.lerp(
      initialModelCoords.z,
      newModelCoords.z,
      progress
    )

    modelTransform.translateX = interpolatedX
    modelTransform.translateY = interpolatedY
    modelTransform.translateZ = interpolatedZ

    const currentAltitude = Math.sin(progress * Math.PI) * maxAltitude

    initialModelCoords.z = currentAltitude
    newModelCoords.z = currentAltitude

    modelTransform.translateZ = currentAltitude
    let coord = new maplibregl.MercatorCoordinate(
      interpolatedX,
      interpolatedY,
      currentAltitude
    )
    let lngLat = coord.toLngLat()

    map.setCenter(lngLat)

    if (progress < 0.95 && progress > 0.0001) {
      // const currentZoom = map.getZoom();
      // if (currentZoom > initialZoom - 14) {
      //     map.zoomTo(currentZoom - 2, {
      //         duration: 1000,
      //     });
      // }
      map.zoomTo(initialZoom - 14, {})
    } else if (progress > 0.95) {
      map.zoomTo(initialZoom, {})
    }

    plane.mixer.update(clock2.getDelta())
    if (progress < 1) {
      if (progress >= 0.825 && !startedAnim) {
        modelTransformRunway.translateX = newModelCoords.x
        modelTransformRunway.translateY = newModelCoords.y
        modelTransformRunway.translateZ = 0

        modelTransformLabel.translateX = newModelCoords.x
        modelTransformLabel.translateY = newModelCoords.y
        modelTransformLabel.translateZ = 0

        modelTransformMarker.translateX = newModelCoords.x
        modelTransformMarker.translateY = newModelCoords.y
        modelTransformMarker.translateZ = 0
        if (runway.model) {
          runway.model.rotation.set(0, -Math.PI, 0)
          sceneRunway.add(runway.model)
        }
        startedAnim = true
        plane.wheelsDownAction.reset()
        plane.wheelsDownAction.play()
        requestAnimationFrame(animateModel)
      } else {
        requestAnimationFrame(animateModel)
      }
    } else {
      movePlane('start')
    }
  }

  map.on('style.load', () => {
    map.addLayer(planeLayer)
    map.addLayer(runwayLayer)
    map.addLayer(labelLayer)
    map.addLayer(markerLayer)
  })

  //starting function
  // var button = document.getElementById("startAnimation");
  // button.addEventListener("click", startAnimation);
  const moveButtonParams = {
    PlaneAnimation: () => {
      console.log('MARKER:', marker.model)

      marker.model.castShadow = true
      label.model.receiveShadow = true

      startAnimation()
    }
  }
  // guiDebug.add(moveButtonParams, 'PlaneAnimation').name('Play Animation')
  function startAnimation () {
    if (label.model && marker.model && runway.model && plane.group) {
      guiDebug.hide()
      console.log('--------------', 'ANIMATION START')
      // if (planeLights != []) {
      //     //lightHelpers();
      //     planeLights.forEach(function (val, ind) {
      //         guiDebug.add(val, "intensity").min(-10000).max(10000).name("directionalLightIntensity" + ind);
      //         guiDebug.add(val.position, "x").min(-10000).max(10000).name("directionalLightPosition" + ind + " x");
      //         guiDebug.add(val.position, "y").min(-10000).max(10000).name("directionalLightPosition" + ind + " y");
      //         guiDebug.add(val.position, "z").min(-10000).max(10000).name("directionalLightPosition" + ind + " z");
      //     })
      // }

      target = modelOrigin
      flyMap()
      // animateLabel('start')
    } else {
      alert('One or more Models Are not Loaded yet!!')
    }
  }
} else {
  const warning = WebGL.getWebGLErrorMessage()
  document.getElementById('container').appendChild(warning)
}
