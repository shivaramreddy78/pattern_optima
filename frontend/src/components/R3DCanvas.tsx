"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Center } from '@react-three/drei';
import * as THREE from 'three';

interface PlacedShape {
  id: string;
  x: number;
  y: number;
  rotation: number;
  points: number[][];
}

interface NestingResponse {
  fabric_width: number;
  fabric_height: number;
  optimized_layout: PlacedShape[];
}

interface R3DCanvasProps {
  result: NestingResponse;
}

// Separate mesh helper containing animations
function AnimatedFabricRoll({ result }: { result: NestingResponse }) {
  const rollRef = useRef<THREE.Mesh>(null);
  const sheetRef = useRef<THREE.Mesh>(null);

  // Rotate the roll cylinder and extend the sheet dynamically on render frames
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    
    // Slow rolling rotation
    if (rollRef.current) {
      rollRef.current.rotation.y = -Math.min(elapsed * 0.4, Math.PI * 1.5);
    }
    
    // Slowly slide sheet forward to simulate unrolling
    if (sheetRef.current) {
      sheetRef.current.position.z = Math.min(elapsed * 0.25, 0.0);
    }
  });

  // Calculate scaling constraints
  const fw = result.fabric_width || 120.0;
  const fh = result.fabric_height || 100.0;
  
  // Normalized dimensions
  const scale = 2.0 / fw; // scale width to fit roughly ~2 units in 3D scene
  const w3D = fw * scale;
  const h3D = fh * scale;

  return (
    <group position={[0, -0.4, 0]}>
      {/* 1. Cylindrical Fabric Core Roll */}
      <mesh ref={rollRef} position={[0, 0.35, -h3D / 2]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, w3D, 32]} />
        <meshStandardMaterial color="#3b82f6" roughness={0.3} metalness={0.1} />
      </mesh>
      
      {/* 2. Unrolled flat fabric sheet */}
      <mesh ref={sheetRef} position={[0, 0.05, -h3D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w3D, h3D]} />
        <meshStandardMaterial color="#0b0f19" roughness={0.9} />
      </mesh>

      {/* 3. Render placed pattern pieces as 3D block meshes */}
      <group position={[0, 0.06, -h3D / 2]}>
        {result.optimized_layout.map((shape, idx) => {
          // Compute local 3D dimensions relative to bounding box
          const xs = shape.points.map(p => p[0]);
          const ys = shape.points.map(p => p[1]);
          const shapeW = (Math.max(...xs) - Math.min(...xs)) * scale;
          const shapeH = (Math.max(...ys) - Math.min(...ys)) * scale;
          
          // Map coordinates relative to sheet plane center
          const px = (shape.x + (Math.max(...xs) - Math.min(...xs)) / 2 - fw / 2) * scale;
          const py = (shape.y + (Math.max(...ys) - Math.min(...ys)) / 2 - fh / 2) * scale;

          const colorCycles = ["#06b6d4", "#a855f7", "#10b981", "#fbbf24", "#3b82f6"];
          const color = colorCycles[idx % colorCycles.length];

          return (
            <mesh key={shape.id} position={[px, 0.01, -py]}>
              <boxGeometry args={[shapeW * 0.9, 0.02, shapeH * 0.9]} />
              <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

export default function R3DCanvas({ result }: R3DCanvasProps) {
  return (
    <Canvas 
      camera={{ position: [0, 2.5, 3.5], fov: 45 }}
      shadows
    >
      <ambientLight intensity={0.5} />
      <directionalLight 
        position={[5, 12, 5]} 
        intensity={0.9} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      <pointLight position={[-4, 3, -4]} intensity={0.4} />

      <Center>
        <AnimatedFabricRoll result={result} />
      </Center>

      <OrbitControls 
        enableZoom={true} 
        maxPolarAngle={Math.PI / 2.2} 
        minDistance={1.5}
        maxDistance={8.0}
      />
    </Canvas>
  );
}
