import { memo } from "react";
import BaseNode from "./BaseNode";
import type { NodeProps } from "@xyflow/react";

function ConceptNode(props: NodeProps) {
  return <BaseNode {...props} />;
}

export default memo(ConceptNode);
