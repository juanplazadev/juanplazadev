import type { Box, Point } from '@/components/diagram/box';
import { box } from '@/components/diagram/box';
import Diagram from '@/components/diagram/diagram';
import DiagramEdge from '@/components/diagram/diagram-edge';
import DiagramGroup from '@/components/diagram/diagram-group';
import DiagramNode from '@/components/diagram/diagram-node';
import type {
    DiagramBlock as DiagramSpec,
    EdgeEndpoint,
} from '@/types/content';

/*
  Turns a stored diagram into the components that already draw one.

  Nothing here draws anything itself - it resolves the node keys an edge names
  into the geometry `box()` derives, which is the one thing the JSON cannot
  carry. Everything else is passed straight through, so the diagrams keep
  rendering exactly as they did when they were hand-written JSX.
*/
function resolve(
    endpoint: EdgeEndpoint,
    boxes: Record<string, Box>,
): Point | null {
    // A literal viewBox point. check-in uses these to spread three arrivals
    // along Redis's top edge so the arrowheads do not stack into a blob.
    if (Array.isArray(endpoint)) {
        return [endpoint[0], endpoint[1]];
    }

    const separator = endpoint.lastIndexOf('.');
    const target = boxes[endpoint.slice(0, separator)];
    const anchor = endpoint.slice(separator + 1);

    if (
        !target ||
        (anchor !== 'top' &&
            anchor !== 'right' &&
            anchor !== 'bottom' &&
            anchor !== 'left')
    ) {
        return null;
    }

    return target[anchor];
}

export default function DiagramBlock({ spec }: { spec: DiagramSpec }) {
    const boxes: Record<string, Box> = {};

    for (const node of spec.nodes) {
        boxes[node.key] = box(node.x, node.y, node.w, node.h);
    }

    return (
        <Diagram
            title={spec.title}
            description={spec.description}
            width={spec.width}
            height={spec.height}
            minWidth={spec.minWidth}
            caption={spec.caption}
        >
            {/* Boundaries first so they sit behind the nodes they contain. */}
            {spec.groups?.map((group, index) => (
                <DiagramGroup
                    key={`${group.label}-${index}`}
                    x={group.x}
                    y={group.y}
                    w={group.w}
                    h={group.h}
                    label={group.label}
                    labelAnchor={group.labelAnchor}
                />
            ))}

            {spec.nodes.map((node) => (
                <DiagramNode
                    key={node.key}
                    box={boxes[node.key]}
                    icon={node.icon}
                    variant={node.variant}
                    iconPlacement={node.iconPlacement}
                    label={node.label}
                    sublabel={node.sublabel}
                />
            ))}

            {spec.edges?.map((edge, index) => {
                const from = resolve(edge.from, boxes);
                const to = resolve(edge.to, boxes);

                // An edge naming a node that is not here has nowhere to attach.
                // Validation catches this on save; dropping it is the fallback
                // for anything already stored, so a bad reference leaves a gap
                // rather than throwing the whole page away.
                if (!from || !to) {
                    return null;
                }

                return (
                    <DiagramEdge
                        key={index}
                        from={from}
                        to={to}
                        bend={edge.bend}
                        label={edge.label}
                        variant={edge.variant}
                    />
                );
            })}
        </Diagram>
    );
}
