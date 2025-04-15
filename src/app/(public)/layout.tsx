export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#15161A] min-h-screen flex items-center justify-center">
      {children}
    </div>
  );
}
