import { useCallback, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { useOfficeStore } from "../../stores/officeStore";

// ══════════════════════════════════════════════════════════════════════════════
// ClickHandler — Raycasting-based interaction layer for the 3D office scene.
//
// Responsibilities:
//   - Click on agent mesh   -> select agent (store.selectAgent)
//   - Click on desk mesh    -> if agent selected, future: assign to desk
//   - Click on empty space  -> deselect current agent
//   - Hover over clickable  -> change cursor to pointer
//
// Implementation:
//   Uses R3F's built-in event system (onPointerDown/onPointerMissed on the
//   scene group) rather than manual raycasting. Agent meshes handle their own
//   click events; this component handles the "miss" case (deselection) and
//   provides the cursor management layer.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * ClickHandler — Renders nothing visible. Attaches event listeners to manage
 * agent selection/deselection and hover cursor changes.
 *
 * Place this as a sibling inside the main scene group.
 */
export function ClickHandler() {
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const { gl } = useThree();

  // Restore cursor when component unmounts
  useEffect(() => {
    return () => {
      gl.domElement.style.cursor = "auto";
    };
  }, [gl]);

  // Click on background/ground -> deselect
  const handlePointerMissed = useCallback(() => {
    if (selectedAgentId) {
      selectAgent(null);
    }
  }, [selectedAgentId, selectAgent]);

  return (
    <>
      {/* Invisible ground plane that catches missed clicks */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          handlePointerMissed();
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = "auto";
        }}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
}

/**
 * Utility: wrap any mesh to make it hoverable with cursor change.
 * Use this on desk/furniture meshes for interactive feedback.
 */
export function useHoverCursor() {
  const { gl } = useThree();

  const onPointerOver = useCallback(() => {
    gl.domElement.style.cursor = "pointer";
  }, [gl]);

  const onPointerOut = useCallback(() => {
    gl.domElement.style.cursor = "auto";
  }, [gl]);

  return { onPointerOver, onPointerOut };
}

/**
 * DeskClickTarget — Invisible click target for desk interaction.
 * Place this at each desk position. When clicked with an agent selected,
 * it could trigger desk assignment (future feature).
 */
export function DeskClickTarget({
  position,
  size = [2, 0.1, 1.2],
}: {
  position: [number, number, number];
  size?: [number, number, number];
}) {
  const { gl } = useThree();
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);

  return (
    <mesh
      position={position}
      onPointerOver={() => {
        if (selectedAgentId) {
          gl.domElement.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = "auto";
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (selectedAgentId) {
          // Future: assign agent to desk
          // For now, deselect
        }
      }}
    >
      <boxGeometry args={size} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

export default ClickHandler;
