"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// 1. Waving Fabric Sheet Component
function WavingFabric() {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (meshRef.current) {
      const geometry = meshRef.current.geometry as THREE.PlaneGeometry;
      const positionAttr = geometry.attributes.position;
      
      // Deform plane vertices to create wave motion
      for (let i = 0; i < positionAttr.count; i++) {
        const x = positionAttr.getX(i);
        const y = positionAttr.getY(i);
        
        // Complex wave function: dual sine waves + diagonal ripple
        const z = 
          Math.sin(x * 0.15 + elapsed * 0.8) * Math.cos(y * 0.15 + elapsed * 0.6) * 2.0 +
          Math.sin((x + y) * 0.08 + elapsed * 1.2) * 1.0;
          
        positionAttr.setZ(i, z);
      }
      positionAttr.needsUpdate = true;
      geometry.computeVertexNormals();
      
      // Slow rotation
      meshRef.current.rotation.z = Math.sin(elapsed * 0.05) * 0.05;
    }
  });

  return (
    <mesh 
      ref={meshRef} 
      rotation={[-Math.PI / 3.5, 0, 0]} 
      position={[0, -2, -5]}
      castShadow
      receiveShadow
    >
      <planeGeometry args={[45, 45, 40, 40]} />
      <meshStandardMaterial 
        color="#1e1b4b"       // Indigo background
        emissive="#0f172a"    // Slate emissive
        roughness={0.2}
        metalness={0.8}
        wireframe={true}
      />
    </mesh>
  );
}

// 2. Interactive Floating Particles reacting to Mouse
function FloatingParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const [positions] = useState(() => {
    const arr = new Float32Array(300 * 3);
    for (let i = 0; i < 300; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 40;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 20 - 10;
    }
    return arr;
  });

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (pointsRef.current) {
      // Float up and down, subtle rotation
      pointsRef.current.rotation.y = elapsed * 0.02;
      pointsRef.current.rotation.x = elapsed * 0.01;
    }
  });

  return (
    <group>
      <Points ref={pointsRef} positions={positions} stride={3}>
        <PointMaterial
          transparent
          color="#06b6d4" // Cyan
          size={0.12}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.6}
        />
      </Points>
    </group>
  );
}

// 3. Dynamic Camera Controller based on cursor
function CameraController() {
  const { camera } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouse.current = {
        x: (e.clientX / window.innerWidth - 0.5) * 3,
        y: -(e.clientY / window.innerHeight - 0.5) * 3,
      };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    // Lerp camera target positions for buttery smooth tracking
    camera.position.x += (mouse.current.x - camera.position.x) * 0.05;
    camera.position.y += (mouse.current.y - camera.position.y) * 0.05;
    camera.lookAt(0, 0, -10);
  });

  return null;
}

export default function Canvas3D() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="absolute inset-0 bg-[#030712] z-[-10]" />;
  }

  return (
    <div className="absolute inset-0 z-[-10] h-full w-full pointer-events-none opacity-40">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 60 }}
        gl={{ antialias: true }}
      >
        <ambientLight intensity={0.2} />
        
        {/* Colorful Spotlights */}
        <spotLight 
          position={[20, 20, 20]} 
          angle={0.4} 
          penumbra={1} 
          intensity={1.5} 
          color="#3b82f6" // Blue
        />
        <spotLight 
          position={[-20, 20, 20]} 
          angle={0.4} 
          penumbra={1} 
          intensity={1.2} 
          color="#a855f7" // Purple
        />
        <pointLight 
          position={[0, 10, -5]} 
          intensity={0.8} 
          color="#06b6d4" // Cyan
        />

        <WavingFabric />
        <FloatingParticles />
        <CameraController />
      </Canvas>
    </div>
  );
}
