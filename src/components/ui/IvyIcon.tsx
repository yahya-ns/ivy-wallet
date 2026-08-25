"use client";

import React from "react";
import {
  Wallet,
  Banknote,
  Landmark,
  CreditCard,
  PiggyBank,
  Coins,
  Utensils,
  ShoppingCart,
  ShoppingBag,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  GraduationCap,
  Briefcase,
  TrendingUp,
  Gift,
  Coffee,
  Fuel,
  Plane,
  Smartphone,
  Tv,
  Receipt,
  Dumbbell,
  Music,
  Shield,
  Tag,
  CircleDot,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Search,
  Filter,
  Eye,
  EyeOff,
  Sun,
  Moon,
  SmartphoneNfc,
  HelpCircle,
  LucideIcon,
  HandCoins,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  landmark: Landmark,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  coins: Coins,
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  "shopping-bag": ShoppingBag,
  car: Car,
  home: Home,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  gift: Gift,
  coffee: Coffee,
  fuel: Fuel,
  plane: Plane,
  smartphone: Smartphone,
  tv: Tv,
  receipt: Receipt,
  dumbbell: Dumbbell,
  music: Music,
  shield: Shield,
  tag: Tag,
  "circle-dot": CircleDot,
  "hand-coins": HandCoins,
};

interface IvyIconProps {
  name?: string | null;
  className?: string;
  size?: number;
}

export function IvyIcon({ name, className = "w-5 h-5", size }: IvyIconProps) {
  if (!name) return <CircleDot className={className} size={size} />;
  const IconComponent = ICON_MAP[name.toLowerCase()] || CircleDot;
  return <IconComponent className={className} size={size} />;
}
