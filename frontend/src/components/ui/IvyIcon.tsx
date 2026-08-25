import React from "react";
import * as Icons from "lucide-react";

interface IvyIconProps {
  name: string;
  size?: number;
  className?: string;
}

export const IvyIcon: React.FC<IvyIconProps> = ({ name, size = 20, className }) => {
  // Convert kebab-case or snake_case to PascalCase
  const pascalName = name
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number; className?: string }>>)[pascalName];

  if (!IconComponent) {
    const Fallback = Icons.CircleDot;
    return <Fallback size={size} className={className} />;
  }

  return <IconComponent size={size} className={className} />;
};
