"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  FaBold,
  FaItalic,
  FaListUl,
  FaLink,
  FaYoutube,
  FaImage,
} from "react-icons/fa";
import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { uploadPoolImage } from "@/lib/utils/imageUpload";

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = "Write your story...",
}: RichTextEditorProps) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { supabase } = useAuthenticatedSupabase();
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Function to handle image upload that can be reused for both file input and paste
  const uploadImage = useCallback(
    async (file: File) => {
      try {
        // Check if Supabase client is available
        if (!supabase) {
          alert(
            "Please wait for authentication to complete before uploading images"
          );
          return null;
        }

        // Validate file type
        if (!file.type.startsWith("image/")) {
          alert("Please select an image file");
          return null;
        }

        // Validate file size (50MB limit)
        if (file.size > 50 * 1024 * 1024) {
          alert("Image size should be less than 50MB");
          return null;
        }

        // Show loading indicator
        setIsUploadingImage(true);

        // Upload the image using the existing uploadPoolImage function
        const result = await uploadPoolImage(file, supabase);

        if (!result.imageUrl) {
          throw new Error("Failed to upload image");
        }

        return result.imageUrl;
      } catch (error) {
        console.error("Error uploading image:", error);
        alert("Failed to upload image. Please try again.");
        return null;
      } finally {
        setIsUploadingImage(false);
      }
    },
    [supabase]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer",
          class: "text-[#836EF9] hover:underline",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          "w-full p-4 bg-transparent text-white placeholder-gray-400 focus:outline-none min-h-[100px] prose prose-invert max-w-none",
      },
      handleDOMEvents: {
        paste: (view, event) => {
          // Check if paste event contains files (images)
          const items = Array.from(event.clipboardData?.items || []);
          const imageItems = items.filter((item) =>
            item.type.startsWith("image")
          );

          if (imageItems.length === 0) {
            // No images in clipboard, let the default paste handler work
            return false;
          }

          // Prevent default paste behavior for images
          event.preventDefault();

          // Show a loading indicator (handled in uploadImage now)

          // Process each image
          Promise.all(
            imageItems.map(async (item) => {
              const file = item.getAsFile();
              if (!file) return null;

              // Upload the image
              const imageUrl = await uploadImage(file);
              return imageUrl;
            })
          ).then((imageUrls) => {
            // Insert all valid uploaded images
            imageUrls.filter(Boolean).forEach((url) => {
              if (url && editor) {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: "image",
                    attrs: { src: url },
                  })
                  .run();
              }
            });
          });

          return true;
        },
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (linkUrl) {
      if (editor.state.selection.empty) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "text",
            text: linkUrl,
            marks: [{ type: "link", attrs: { href: linkUrl } }],
          })
          .run();
      } else {
        editor.chain().focus().setLink({ href: linkUrl }).run();
      }
      setLinkUrl("");
      setShowLinkInput(false);
    }
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Use the shared upload function
    const imageUrl = await uploadImage(file);

    if (imageUrl) {
      // Insert the image into the editor
      editor
        .chain()
        .focus()
        .insertContent({
          type: "image",
          attrs: { src: imageUrl },
        })
        .run();
    }
  };

  return (
    <div className="bg-[#FFFFFF14] rounded-lg overflow-hidden relative">
      <EditorContent editor={editor} />

      {/* Loading overlay for pasted images */}
      {isUploadingImage && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-white">Uploading image...</div>
        </div>
      )}

      {/* Text formatting toolbar */}
      <div className="flex items-center p-2 border-t border-gray-700">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 ${
            editor.isActive("bold") ? "text-white" : "text-gray-400"
          } hover:text-white`}
        >
          <FaBold />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 ${
            editor.isActive("italic") ? "text-white" : "text-gray-400"
          } hover:text-white`}
        >
          <FaItalic />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 ${
            editor.isActive("bulletList") ? "text-white" : "text-gray-400"
          } hover:text-white`}
        >
          <FaListUl />
        </button>
        <button
          type="button"
          onClick={() => {
            editor.chain().focus();
            setShowLinkInput(true);
          }}
          className={`p-2 ${
            editor.isActive("link") ? "text-white" : "text-gray-400"
          } hover:text-white`}
        >
          <FaLink />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-white"
          title="Upload image (or paste directly)"
        >
          <FaImage />
        </button>
      </div>

      {/* Hidden file input for image upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Link input modal */}
      {showLinkInput && (
        <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
          <div className="bg-[#1A1B1F] p-6 rounded-lg w-[400px] border border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Add Link</h3>
            <input
              type="text"
              placeholder="Enter URL"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="w-full p-3 bg-[#FFFFFF14] rounded text-white mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addLink();
                }
              }}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLinkInput(false)}
                className="px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addLink}
                className="px-4 py-2 bg-[#836EF9] text-white rounded hover:bg-[#7058E8]"
              >
                Add Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
