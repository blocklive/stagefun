"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useState, useRef, useCallback } from "react";
import {
  FaBold,
  FaItalic,
  FaLink,
  FaListUl,
  FaListOl,
  FaQuoteLeft,
  FaImage,
  FaUnlink,
} from "react-icons/fa";
import { useAuthenticatedSupabase } from "@/hooks/useAuthenticatedSupabase";
import { uploadPoolImage } from "@/lib/utils/imageUpload";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const TiptapEditor = ({
  content,
  onChange,
  placeholder = "Write something...",
}: TiptapEditorProps) => {
  const [linkUrl, setLinkUrl] = useState("");
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const { supabase } = useAuthenticatedSupabase();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Use the shared upload function
    const imageUrl = await uploadImage(file);

    if (imageUrl && editor) {
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
      Link.configure({
        openOnClick: false,
        protocols: ["http", "https"],
        HTMLAttributes: {
          class: "text-blue-400 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-lg max-w-full h-auto",
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm focus:outline-none min-h-[120px] max-w-none",
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
  });

  if (!editor) {
    return null;
  }

  const addLink = () => {
    if (linkUrl) {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: linkUrl, target: "_blank" })
        .run();
    }
    setLinkUrl("");
    setShowLinkInput(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
  };

  return (
    <div className="border border-[#FFFFFF1A] rounded-lg overflow-hidden relative">
      <div className="flex flex-wrap gap-1 p-2 bg-[#FFFFFF0A] border-b border-[#FFFFFF1A]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-[#FFFFFF14] ${
            editor.isActive("bold") ? "bg-[#FFFFFF14]" : ""
          }`}
        >
          <FaBold className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-[#FFFFFF14] ${
            editor.isActive("italic") ? "bg-[#FFFFFF14]" : ""
          }`}
        >
          <FaItalic className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className={`p-2 rounded hover:bg-[#FFFFFF14] ${
            editor.isActive("link") ? "bg-[#FFFFFF14]" : ""
          }`}
        >
          <FaLink className="text-white" />
        </button>
        {editor.isActive("link") && (
          <button
            type="button"
            onClick={removeLink}
            className="p-2 rounded hover:bg-[#FFFFFF14]"
          >
            <FaUnlink className="text-white" />
          </button>
        )}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-[#FFFFFF14] ${
            editor.isActive("bulletList") ? "bg-[#FFFFFF14]" : ""
          }`}
        >
          <FaListUl className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-[#FFFFFF14] ${
            editor.isActive("orderedList") ? "bg-[#FFFFFF14]" : ""
          }`}
        >
          <FaListOl className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 rounded hover:bg-[#FFFFFF14] ${
            editor.isActive("blockquote") ? "bg-[#FFFFFF14]" : ""
          }`}
        >
          <FaQuoteLeft className="text-white" />
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded hover:bg-[#FFFFFF14]"
          title="Upload image (or paste directly)"
        >
          <FaImage className="text-white" />
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

      {showLinkInput && (
        <div className="p-2 bg-[#FFFFFF0A] border-b border-[#FFFFFF1A] flex">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 bg-[#FFFFFF14] border border-[#FFFFFF1A] rounded-l-lg p-2 text-white"
          />
          <button
            type="button"
            onClick={addLink}
            className="bg-[#FFFFFF14] hover:bg-[#FFFFFF24] text-white rounded-r-lg px-4"
          >
            Add
          </button>
        </div>
      )}

      {/* Loading overlay for image uploads */}
      {isUploadingImage && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
          <div className="text-white">Uploading image...</div>
        </div>
      )}

      <div className="p-3 bg-[#FFFFFF0A]">
        <EditorContent editor={editor} className="min-h-[100px] block" />
      </div>
    </div>
  );
};

export default TiptapEditor;
