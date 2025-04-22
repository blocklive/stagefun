import React, { useState, useEffect, ChangeEvent } from "react";
import { validateSlug, formatSlug } from "@/lib/utils/slugValidation";

interface SlugEditorProps {
  initialSlug: string;
  onChange: (slug: string) => void;
  className?: string;
}

export default function SlugEditor({
  initialSlug,
  onChange,
  className = "",
}: SlugEditorProps) {
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState<string | null>(null);

  // Initialize with provided slug
  useEffect(() => {
    if (initialSlug && !slug) {
      setSlug(initialSlug);
    }
  }, [initialSlug, slug]);

  // Custom format that allows dashes
  const formatSlugWithDashes = (input: string): string => {
    // Allow lowercase letters, numbers, and dashes
    // Remove any other characters
    return input.toLowerCase().replace(/[^a-z0-9-]/g, "");
  };

  // Handle slug change with validation
  const handleSlugChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newSlug = formatSlugWithDashes(e.target.value);
    setSlug(newSlug);

    // Clear any previous errors when editing
    if (slugError) setSlugError(null);

    // Notify parent component
    onChange(newSlug);
  };

  // Validate slug when input loses focus
  const validateSlugOnBlur = () => {
    if (!slug) return; // Empty is valid

    const validation = validateSlug(slug);
    if (!validation.isValid) {
      setSlugError(validation.reason || "Invalid slug");
    } else {
      setSlugError(null);
    }
  };

  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-4">Public URL</h2>
      <div className="flex items-center bg-[#FFFFFF14] rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#836EF9]">
        <span className="px-4 py-4 text-gray-400 bg-gray-700 border-r border-gray-600">
          app.stage.fun/
        </span>
        <input
          id="poolSlug"
          type="text"
          value={slug}
          onChange={handleSlugChange}
          onBlur={validateSlugOnBlur}
          placeholder="your-unique-url"
          className={`w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none ${
            slugError ? "border-red-500" : ""
          }`}
          maxLength={32}
        />
      </div>
      {slugError ? (
        <p className="mt-2 text-sm text-red-500">{slugError}</p>
      ) : (
        <p className="mt-2 text-sm text-gray-500">
          Customize your pool's public link (letters, numbers, hyphens only).
          Minimum 3 characters.
        </p>
      )}
    </div>
  );
}
