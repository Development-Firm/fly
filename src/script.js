import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import GUI from 'lil-gui'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'

/**
 * Base
 */
// Debug
const gui = new GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Lights
 */
// Ambient light
const ambientLight = new THREE.AmbientLight(0xffffff, 1)
gui
  .add(ambientLight, 'intensity')
  .name('AMBIENT LIGHT')
  .min(0)
  .max(3)
  .step(0.001)
// scene.add(ambientLight)

const lightProbe = new THREE.LightProbe()
scene.add(lightProbe)

// scene.add(new THREE.AxesHelper(5))

// Directional light
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.castShadow = true
directionalLight.position.set(0, 2, -1)
// directionalLight.shadow.mapSize.width = 1024
// directionalLight.shadow.mapSize.height = 1024
// directionalLight.shadow.camera.far = 20
directionalLight.shadow.mapSize.width = 1024
directionalLight.shadow.mapSize.height = 1024
directionalLight.shadow.camera.near = 0.5
directionalLight.shadow.camera.far = 25
directionalLight.shadow.camera.left = -10
directionalLight.shadow.camera.right = 10
directionalLight.shadow.camera.top = 10
directionalLight.shadow.camera.bottom = -10
directionalLight.shadow.radius = 5
directionalLight.shadow.blurSamples = 25
const diractionLightHelper = new THREE.DirectionalLightHelper(
  directionalLight,
  0.5,
  'red'
)
// scene.add(diractionLightHelper)
gui
  .add(directionalLight, 'intensity')
  .name('DIRECTIONAL LIGHT')
  .min(0)
  .max(3)
  .step(0.001)
gui.add(directionalLight.position, 'x').min(-5).max(5).step(0.001)
gui.add(directionalLight.position, 'y').min(-5).max(5).step(0.001)
gui.add(directionalLight.position, 'z').min(-5).max(5).step(0.001)
scene.add(directionalLight)

/**
 * Materials
 */
const material = new THREE.MeshStandardMaterial()
material.roughness = 0.7
gui.add(material, 'metalness').min(0).max(1).step(0.001)
gui.add(material, 'roughness').min(0).max(1).step(0.001)

/**
 * Objects
 */
// const sphere = new THREE.Mesh(
//     new THREE.SphereGeometry(0.5, 32, 32),
//     material
// )

// const plane = new THREE.Mesh(
//     new THREE.PlaneGeometry(5, 5),
//     material
// )
// plane.rotation.x = - Math.PI * 0.5
// plane.position.y = - 0.5

// scene.add(sphere, plane)
const loader = new GLTFLoader()
let cubeTexture
let mixer

new RGBELoader()
  .setPath('./textures/')
  // .load('table_mountain_1_puresky_2k.hdr', function (texture) {
  .load('tief_etz_1k.hdr', function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping
    texture.flipY = true
    cubeTexture = texture
    console.log('----TEXTURE:', texture)
    scene.background = texture
    scene.backgroundBlurriness = 0.8
    scene.environment = texture
    // loadModels()
  })

function markerLoader () {
  loader.load('/models/newModels/marker.glb', gltf => {
    const model = gltf.scene

    model.traverse(child => {
      if (child.isMesh) {
        const material = child.material

        console.log('MARKER MATERIAL BEFORE:', material, child)

        child.castShadow = true
        if (material) {
          // material.emissive = new THREE.Color(0xffffff)
          // material.emissiveIntensity = 0.0885
          // material.emissive = new THREE.Color(0xffffff)
          // material.emissiveIntensity = 0.04
          material.envMap = cubeTexture
          material.envMapIntensity = 1
          material.metalness = 0
          material.roughness = 0
          console.log('MARKER MATERIAL AFTER:', material)
        }
      }
    })

    mixer = new THREE.AnimationMixer(model)
    // let modelAnimation = mixer.clipAction(gltf.animations[0])
    // modelAnimation.clampWhenFinished = true
    // modelAnimation.loop = THREE.LoopOnce
    console.log('GLTF', gltf)

    const clips = gltf.animations
    let appearingMarkerClip = THREE.AnimationClip.findByName(
      clips,
      'marker_appearing_animation'
    )
    let appearingMarkerAction = mixer.clipAction(appearingMarkerClip)
    appearingMarkerAction.loop = THREE.LoopOnce

    model.position.set(0, -1, -0.2)
    scene.add(model)
    appearingMarkerAction.play()
  })
}
function labelLoader () {
  loader.load('/models/label.glb', gltf => {
    const model = gltf.scene

    model.traverse(child => {
      if (child.isMesh) {
        const material = child.material
        child.receiveShadow = true
        console.log('LABEL MATERIAL BEFORE:', material)

        if (material) {
          // material.emissive = new THREE.Color(0xffffff)
          // material.emissiveIntensity = 0.0885
          // material.emissive = new THREE.Color(0xffffff)
          // material.emissiveIntensity = 0.04
          material.envMap = cubeTexture
          material.envMapIntensity = 1
          material.color = new THREE.Color(0xd66b00)

          material.metalness = 0
          material.roughness = 0
          console.log('LABEL MATERIAL AFTER:', material)
        }
      }
    })

    model.position.set(0, -1, 0)
    scene.add(model)
  })
}

markerLoader()
labelLoader()

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight
}

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
)
camera.position.x = 1
camera.position.y = 1
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.NoToneMapping

/**
 * Animate
 */
const clock = new THREE.Clock()

const tick = () => {
  const elapsedTime = clock.getElapsedTime()
  //   if (mixer) {
  //     mixer.update(clock.getDelta())
  //   }
  // Update controls
  controls.update()

  // Render
  renderer.render(scene, camera)

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()
