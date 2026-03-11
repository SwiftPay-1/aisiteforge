import { Canvas } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Torus, Box, MeshWobbleMaterial } from "@react-three/drei";
import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function GlowingSphere({ position, color, size = 1, distort = 0.4, speed = 2 }: {
  position: [number, number, number];
  color: string;
  size?: number;
  distort?: number;
  speed?: number;
}) {
  return (
    <Float speed={speed} rotationIntensity={1.5} floatIntensity={2}>
      <Sphere args={[size, 64, 64]} position={position}>
        <MeshDistortMaterial
          color={color}
          attach="material"
          distort={distort}
          speed={speed}
          roughness={0.1}
          metalness={0.9}
          envMapIntensity={1}
        />
      </Sphere>
      {/* Inner glow */}
      <Sphere args={[size * 1.15, 32, 32]} position={position}>
        <meshBasicMaterial color={color} transparent opacity={0.05} />
      </Sphere>
    </Float>
  );
}

function ReflectiveDonut({ position, color, size = 1 }: {
  position: [number, number, number];
  color: string;
  size?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.3 + 0.5;
      ref.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.5} floatIntensity={1.5}>
      <Torus ref={ref} args={[size, size * 0.4, 64, 128]} position={position}>
        <meshStandardMaterial
          color={color}
          roughness={0.05}
          metalness={1}
          envMapIntensity={2}
        />
      </Torus>
    </Float>
  );
}

function SmallDonut({ position, color, size = 0.5 }: {
  position: [number, number, number];
  color: string;
  size?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.4;
      ref.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.5) * 0.5;
    }
  });

  return (
    <Float speed={1.8} rotationIntensity={1} floatIntensity={1.2}>
      <Torus ref={ref} args={[size, size * 0.35, 32, 64]} position={position}>
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.95} />
      </Torus>
    </Float>
  );
}

function RotatingCube({ position, color }: { position: [number, number, number]; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x = state.clock.elapsedTime * 0.3;
      ref.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={2} floatIntensity={1}>
      <Box ref={ref} args={[0.7, 0.7, 0.7]} position={position}>
        <meshStandardMaterial color={color} roughness={0.15} metalness={0.9} />
      </Box>
    </Float>
  );
}

function FloatingShapes() {
  return (
    <>
      {/* Large hero donut - right side like reference */}
      <ReflectiveDonut position={[4.5, -0.5, -1]} color="#06b6d4" size={1.8} />

      {/* Smaller donut - left side */}
      <SmallDonut position={[-4, -1.5, -2]} color="#818cf8" size={0.6} />

      {/* Large glowing sphere - upper left like reference */}
      <GlowingSphere position={[-3.5, 2, -2]} color="#7c3aed" size={1.4} distort={0.35} speed={1.5} />

      {/* Medium sphere - lower left */}
      <GlowingSphere position={[-2, -2.5, -3]} color="#4f46e5" size={0.7} distort={0.3} speed={2.5} />

      {/* Small sphere - center bottom */}
      <GlowingSphere position={[1, -2, -2]} color="#06b6d4" size={0.5} distort={0.25} speed={3} />

      {/* Small glowing orb - upper right */}
      <GlowingSphere position={[2.5, 2.5, -3]} color="#818cf8" size={0.4} distort={0.2} speed={2} />

      {/* Rotating cube - upper center like reference */}
      <RotatingCube position={[1, 3, -3]} color="#374151" />

      {/* Tiny floating sphere */}
      <Float speed={2.5} rotationIntensity={1} floatIntensity={3}>
        <Sphere args={[0.2, 16, 16]} position={[-1, 0.5, -1]}>
          <meshStandardMaterial color="#a78bfa" roughness={0.2} metalness={0.8} emissive="#7c3aed" emissiveIntensity={0.3} />
        </Sphere>
      </Float>

      {/* Extra tiny orbs for depth */}
      <Float speed={3} rotationIntensity={0.5} floatIntensity={2}>
        <Sphere args={[0.12, 16, 16]} position={[3.5, 1.5, -4]}>
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.6} />
        </Sphere>
      </Float>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
        <Sphere args={[0.15, 16, 16]} position={[-4.5, 0, -5]}>
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.4} />
        </Sphere>
      </Float>

      {/* Lighting setup for realistic reflections */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <directionalLight position={[-5, 3, 2]} intensity={0.4} color="#7c3aed" />
      <pointLight position={[-5, -5, 5]} intensity={0.8} color="#7c3aed" />
      <pointLight position={[5, -3, -3]} intensity={0.6} color="#06b6d4" />
      <pointLight position={[0, 5, 0]} intensity={0.3} color="#818cf8" />
      <spotLight position={[3, 5, 3]} angle={0.4} penumbra={1} intensity={0.5} color="#06b6d4" />
    </>
  );
}

export default function HeroScene() {
  return (
    <div className="absolute inset-0 opacity-70">
      <Canvas camera={{ position: [0, 0, 7], fov: 45 }} dpr={[1, 2]}>
        <Suspense fallback={null}>
          <FloatingShapes />
        </Suspense>
      </Canvas>
    </div>
  );
}
