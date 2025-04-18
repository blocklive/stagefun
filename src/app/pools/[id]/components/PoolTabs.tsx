import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { fetcher } from "@/lib/utils";

interface PoolTabsProps {
  poolId: string;
  activeTab: "about" | "patrons" | "updates";
  isCreator: boolean;
}

export default function PoolTabs({
  poolId,
  activeTab,
  isCreator,
}: PoolTabsProps) {
  const pathname = usePathname();
  const baseUrl = pathname.split("/").slice(0, -1).join("/");

  // Fetch update count
  const { data: updateData } = useSWR(
    `/api/pool-updates?poolId=${poolId}`,
    fetcher
  );

  // Fetch patron count
  const { data: patronData } = useSWR(
    `/api/pool-patrons?poolId=${poolId}`,
    fetcher
  );

  const updateCount = updateData?.updates?.length || 0;
  const patronCount = patronData?.patrons?.length || 0;

  return (
    <div className="flex border-b border-gray-800 mb-6">
      <Link
        href={`${baseUrl}/about`}
        className={`px-4 py-3 font-medium text-sm ${
          activeTab === "about"
            ? "text-white border-b-2 border-white"
            : "text-gray-400 hover:text-gray-300"
        }`}
      >
        About
      </Link>

      <Link
        href={`${baseUrl}/patrons`}
        className={`px-4 py-3 font-medium text-sm ${
          activeTab === "patrons"
            ? "text-white border-b-2 border-white"
            : "text-gray-400 hover:text-gray-300"
        }`}
      >
        Patrons {patronCount > 0 && `(${patronCount})`}
      </Link>

      <Link
        href={`${baseUrl}/updates`}
        className={`px-4 py-3 font-medium text-sm ${
          activeTab === "updates"
            ? "text-white border-b-2 border-white"
            : "text-gray-400 hover:text-gray-300"
        }`}
      >
        Updates {updateCount > 0 && `(${updateCount})`}
      </Link>
    </div>
  );
}
