interface RelationshipColorDiscProps {
  color?: string;
  selected?: boolean;
  size?: "sm" | "lg";
  className?: string;
}

const SIZE_CLASSES = {
  sm: "w-2 h-2 border-[1.5px]",
  lg: "w-6 h-6 border-2",
} as const;

export default function RelationshipColorDisc({
  color = "#6b7280",
  selected = true,
  size = "sm",
  className = "",
}: RelationshipColorDiscProps) {
  return (
    <span
      aria-hidden="true"
      className={`${SIZE_CLASSES[size]} inline-block shrink-0 rounded-full ${className}`}
      style={{
        backgroundColor: selected ? color : "transparent",
        borderColor: color,
      }}
    />
  );
}
