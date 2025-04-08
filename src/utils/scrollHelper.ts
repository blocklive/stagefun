/**
 * Scrolls the page to the top using multiple methods for cross-browser/device compatibility
 * Particularly helpful for mobile browsers where standard methods sometimes fail
 */
export const scrollToTop = () => {
  try {
    // Method 1: Standard scrollTo
    window.scrollTo(0, 0);

    // Method 2: scrollTo with behavior option
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto", // Use 'auto' instead of 'smooth' for more reliable mobile scrolling
    });

    // Method 3: Try scrolling the document element and body (works in different browsers)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }

    if (document.body) {
      document.body.scrollTop = 0;
    }

    // Method 4: For iOS Safari specifically
    if (typeof window !== "undefined" && "ontouchstart" in window) {
      // Add a slight delay and scroll twice for iOS
      setTimeout(() => {
        window.scrollTo(0, 1);
        setTimeout(() => window.scrollTo(0, 0), 10);
      }, 50);
    }
  } catch (e) {
    console.error("Error during scroll:", e);
  }
};
