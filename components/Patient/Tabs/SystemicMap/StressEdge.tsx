import React, { memo } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    EdgeProps,
    useReactFlow,
} from '@xyflow/react';
import { Zap } from 'lucide-react';

const StressEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: '#ef4444', strokeWidth: 2, strokeDasharray: '5,5' }} />
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        fontSize: 12,
                        pointerEvents: 'all',
                    }}
                    className="nodrag nopan"
                >
                    <div className="bg-red-100 dark:bg-red-900/30 p-1 rounded-full border border-red-300 dark:border-red-500 shadow-sm">
                        <Zap size={10} className="text-red-600 fill-red-600" />
                    </div>
                </div>
            </EdgeLabelRenderer>
        </>
    );
};

export default memo(StressEdge);
