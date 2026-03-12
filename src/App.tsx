import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { MainScene } from './components/scene/MainScene'
import OverlayLayout from './components/ui/OverlayLayout'
import './index.css'

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f0eaf8] z-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg font-medium">Loading 3D Office...</p>
      </div>
    </div>
  )
}

function App() {
  return (
    <div className="w-screen h-screen relative overflow-hidden">
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          shadows
          camera={{ position: [20, 15, 20], fov: 50, near: 0.1, far: 200 }}
          gl={{
            antialias: true,
            powerPreference: 'default',
            stencil: false,
            depth: true,
          }}
          dpr={[1, 1.5]}
        >
          <MainScene />
        </Canvas>
      </Suspense>
      <OverlayLayout />
    </div>
  )
}

export default App
