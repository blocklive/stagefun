import BottomNavbar from "../../../components/BottomNavbar";

interface FixedBottomBarProps {
  showCommitButton: boolean;
  onCommitClick: () => void;
  commitButtonText?: string;
}

/**
 * FixedBottomBar component handles the fixed positioning of bottom elements
 * - On mobile: Shows both commit button and bottom navigation
 * - On desktop: Shows only commit button
 *
 * The component maintains consistent spacing and positioning:
 * - No gaps between elements and screen edges
 * - Proper z-index layering
 * - Correct sidebar offset on desktop
 */
export default function FixedBottomBar({
  showCommitButton,
  onCommitClick,
  commitButtonText = "Commit",
}: FixedBottomBarProps) {
  return (
    <>
      {/* Commit Button - Fixed at bottom for both mobile and desktop */}
      {showCommitButton && (
        <div className="fixed bottom-20 left-0 right-0 z-50 bg-[#15161a] border-t border-gray-800 shadow-lg md:bottom-0">
          <div className="max-w-[1200px] mx-auto md:pl-64 px-4 py-3">
            <button
              onClick={onCommitClick}
              className="w-full bg-[#836EF9] hover:bg-[#7058E8] text-white py-4 px-4 rounded-full font-medium text-lg flex items-center justify-center transition-colors"
            >
              {commitButtonText}
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation - Mobile only */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#15161a] border-t border-gray-800 md:hidden">
        <BottomNavbar activeTab="party" />
      </div>

      {/* Bottom padding to prevent content overlap */}
      <div className="pb-56 md:pb-24"></div>
    </>
  );
}
