type NavItemProps = {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
};

export default function NavItem({ icon, label, active = false }: NavItemProps) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className={`${active ? "text-white" : "text-gray-500"}`}>
        {label}
      </span>
    </div>
  );
}
