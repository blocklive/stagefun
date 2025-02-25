export interface NavItem {
  id: string;
  name: string;
  icon: string;
  color: string;
  letter?: string;
}

export const navigationItems: NavItem[] = [
  {
    id: "new",
    name: "New",
    icon: "bolt",
    color: "transparent",
  },
  {
    id: "dlm",
    name: "DLM",
    icon: "circle",
    color: "bg-teal-400",
    letter: "D",
  },
  {
    id: "vortex",
    name: "VORTEX",
    icon: "circle",
    color: "bg-green-400",
    letter: "V",
  },
  {
    id: "lumix",
    name: "LUMIX",
    icon: "circle",
    color: "bg-blue-300",
    letter: "L",
  },
  {
    id: "pyro",
    name: "PYRO",
    icon: "circle",
    color: "bg-red-400",
    letter: "P",
  },
  {
    id: "nexus",
    name: "NEXUS",
    icon: "circle",
    color: "bg-yellow-400",
    letter: "N",
  },
  {
    id: "quantum",
    name: "QUANTUM",
    icon: "circle",
    color: "bg-purple-400",
    letter: "Q",
  },
  {
    id: "zenith",
    name: "ZENITH",
    icon: "circle",
    color: "bg-indigo-400",
    letter: "Z",
  },
  {
    id: "fusion",
    name: "FUSION",
    icon: "circle",
    color: "bg-pink-400",
    letter: "F",
  },
  {
    id: "echo",
    name: "ECHO",
    icon: "circle",
    color: "bg-cyan-400",
    letter: "E",
  },
  {
    id: "apex",
    name: "APEX",
    icon: "circle",
    color: "bg-amber-400",
    letter: "A",
  },
  {
    id: "nova",
    name: "NOVA",
    icon: "circle",
    color: "bg-lime-400",
    letter: "N",
  },
  {
    id: "pulse",
    name: "PULSE",
    icon: "circle",
    color: "bg-emerald-400",
    letter: "P",
  },
];
