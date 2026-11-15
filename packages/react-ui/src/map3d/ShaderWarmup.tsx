import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

export interface ShaderWarmupProps {
  ready: boolean;
  onCompiled: () => void;
  onError?: (message: string) => void;
}

/**
 * Precompiles WebGL shaders once scene textures and meshes are mounted,
 * triggers a demand frame, and reports completion after the first painted frame.
 */
export function ShaderWarmup({ ready, onCompiled, onError }: ShaderWarmupProps) {
  const { gl, scene, camera, invalidate } = useThree();
  const compiledRef = useRef(false);
  const onCompiledRef = useRef(onCompiled);
  const onErrorRef = useRef(onError);
  onCompiledRef.current = onCompiled;
  onErrorRef.current = onError;

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = () => {
      onErrorRef.current?.('Se perdió el contexto WebGL.');
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost);
    };
  }, [gl]);

  useEffect(() => {
    if (!ready || compiledRef.current) return;
    compiledRef.current = true;

    let rafId = 0;
    try {
      gl.compile(scene, camera);
      invalidate();
      rafId = requestAnimationFrame(() => {
        onCompiledRef.current();
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al compilar shaders 3D.';
      onErrorRef.current?.(message);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [ready, gl, scene, camera, invalidate]);

  return null;
}
