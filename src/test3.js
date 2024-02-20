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

const map = (window.map = new maplibregl.Map({
  container: 'map',
  style:
    'https://api.maptiler.com/maps/basic/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
  zoom: 18,
  center: [148.9819, -35.3981],
  pitch: 60,
  antialias: true // create the gl context with MSAA antialiasing, so custom layers are antialiased
}))

// parameters to ensure the model is georeferenced correctly on the map
const modelOrigin = [148.9819, -35.39847]
const modelAltitude = 0
const modelRotate = [Math.PI / 2, 0, 0]

const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
  modelOrigin,
  modelAltitude
)

// transformation parameters to position, rotate and scale the 3D model onto the map
const modelTransform = {
  translateX: modelAsMercatorCoordinate.x,
  translateY: modelAsMercatorCoordinate.y,
  translateZ: modelAsMercatorCoordinate.z,
  rotateX: modelRotate[0],
  rotateY: modelRotate[1],
  rotateZ: modelRotate[2],
  /* Since our 3D model is in real world meters, a scale transform needs to be
   * applied since the CustomLayerInterface expects units in MercatorCoordinates.
   */
  scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
}

// configuration of the custom layer for a 3D model per the CustomLayerInterface
const customLayer = {
  id: '3d-model',
  type: 'custom',
  renderingMode: '3d',
  onAdd (map, gl) {
    this.camera = new THREE.Camera()
    this.scene = new THREE.Scene()

    // create two three.js lights to illuminate the model
    const directionalLight = new THREE.DirectionalLight(0xffffff)
    directionalLight.castShadow = true
    directionalLight.position.set(0, -70, 100).normalize()
    this.scene.add(directionalLight)

    const directionalLight2 = new THREE.DirectionalLight(0xffffff)
    directionalLight2.castShadow = true

    directionalLight2.position.set(0, 70, 100).normalize()
    this.scene.add(directionalLight2)

    // use the three.js GLTF loader to add the 3D model to the three.js scene
    const loader = new GLTFLoader()
    loader.load('/models/newModels/marker.glb', gltf => {
      const marker = gltf.scene
      marker.traverse(child => {
        if (child.isMesh) {
          const material = child.material
          child.castShadow = true
          child.material.needsUpdate = true
          if (material) {
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.0885;
            // material.emissive = new THREE.Color(0xffffff);
            // material.emissiveIntensity = 0.04;
            // material.envMap = cubeTexture
            // material.envMapIntensity = 0.08
            material.metalness = 0
            material.roughness = 0
            // material.color = new THREE.Color('red')
          }
        }
      })

      marker.position.set(0, 0.4, -0.25)
      marker.position.set(0, 0.4, -0.25)
      this.scene.add(marker)
    })

    loader.load('/models/label.glb', gltf => {
      const label = gltf.scene

      label.traverse(child => {
        if (child.isMesh) {
          const material = child.material
          child.receiveShadow = true
          child.material.needsUpdate = true
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
      label.position.set(0, 0.3, 0)
      label.scale.set(1.5, 1.5, 1.5)
      //   this.scene.add(label)
    })
    this.map = map

    // use the MapLibre GL JS map canvas for three.js
    this.renderer = new THREE.WebGLRenderer({
      canvas: map.getCanvas(),
      context: gl,
      antialias: true
    })

    this.renderer.autoClear = false
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
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.render(this.scene, this.camera)
    this.map.triggerRepaint()
  }
}

map.on('style.load', () => {
  map.addLayer(customLayer)
})
