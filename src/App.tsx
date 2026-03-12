import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { MainScene } from './components/scene/MainScene'
import { EditorScene } from './components/editor/EditorScene'
import OverlayLayout from './components/ui/OverlayLayout'
import EditorLayout from './components/editor/EditorLayout'
import { useOfficeStore } from './stores/officeStore'
import './index.css'

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#f0eaf8] z-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 text-lg font-medium">Loading...</p>
      </div>
    </div>
  )
}

function OfficeMode() {
  return (
    <>
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
    </>
  )
}

function EditorMode() {
  return (
    <>
      <Suspense fallback={<LoadingScreen />}>
        <Canvas
          shadows
          camera={{ position: [0, 1.5, 4], fov: 45, near: 0.1, far: 50 }}
          gl={{
            antialias: true,
            powerPreference: 'default',
            stencil: false,
            depth: true,
          }}
          dpr={[1, 1.5]}
        >
          <EditorScene />
        </Canvas>
      </Suspense>
      <EditorLayout />
    </>
  )
}

function App() {
  const appMode = useOfficeStore((s) => s.appMode)

  return (
    <div className="w-screen h-screen relative overflow-hidden">
      {appMode === 'editor' ? <EditorMode /> : <OfficeMode />}
    </div>
  )
}

export default App
