import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Torus, Box } from "@react-three/drei";
import { Suspense } from "react";

function FloatingShapes() {
  return (
    <>
      <Float speed={2} rotationIntensity={2} floatIntensity={2}>
        <Sphere args={[1, 32, 32]} position={[-3, 1, -2]}>
          <MeshDistortMaterial
            color="#7c3aed"
            attach="material"
            distort={0.4}
            speed={2}
            roughness={0.2}
            metalness={0.8}
          />
        </Sphere>
      </Float>
      <Float speed={1.5} rotationIntensity={1.5} floatIntensity={1.5}>
        <Torus args={[0.8, 0.3, 16, 32]} position={[3, -1, -1]} rotation={[Math.PI / 4, 0, 0]}>
          <meshStandardMaterial color="#06b6d4" roughness={0.3} metalness={0.7} />
        </Torus>
      </Float>
      <Float speed={1.8} rotationIntensity={3} floatIntensity={1}>
        <Box args={[0.8, 0.8, 0.8]} position={[2, 2, -3]} rotation={[0.5, 0.5, 0]}>
          <meshStandardMaterial color="#2dd4bf" roughness={0.2} metalness={0.9} />
        </Box>
      </Float>
      <Float speed={1.2} rotationIntensity={2} floatIntensity={2}>
        <Sphere args={[0.5, 32, 32]} position={[-2, -2, -2]}>
          <MeshDistortMaterial color="#818cf8" distort={0.3} speed={3} roughness={0.1} metalness={0.9} />
        </Sphere>
      </Float>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -5, 5]} intensity={0.5} color="#7c3aed" />
      <pointLight position={[5, -5, -5]} intensity={0.3} color="#06b6d4" />
    </>
  );
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 opacity-60">
      <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
        <Suspense fallback={null}>
          <FloatingShapes />
        </Suspense>
      </Canvas>
    </div>
  );
}
