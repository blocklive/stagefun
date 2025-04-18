"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import { useState } from "react";
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
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);

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
          "prose prose-invert prose-sm focus:outline-none min-h-[250px] max-w-none",
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

  const addImage = () => {
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setImageUrl("");
    setShowImageInput(false);
  };

  return (
    <div className="border border-[#FFFFFF1A] rounded-lg overflow-hidden">
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
          onClick={() => setShowImageInput(!showImageInput)}
          className="p-2 rounded hover:bg-[#FFFFFF14]"
        >
          <FaImage className="text-white" />
        </button>
      </div>

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

      {showImageInput && (
        <div className="p-2 bg-[#FFFFFF0A] border-b border-[#FFFFFF1A] flex">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/image.jpg"
            className="flex-1 bg-[#FFFFFF14] border border-[#FFFFFF1A] rounded-l-lg p-2 text-white"
          />
          <button
            type="button"
            onClick={addImage}
            className="bg-[#FFFFFF14] hover:bg-[#FFFFFF24] text-white rounded-r-lg px-4"
          >
            Add
          </button>
        </div>
      )}

      <div className="p-3 bg-[#FFFFFF0A]">
        <EditorContent editor={editor} className="min-h-[250px] block" />
      </div>
    </div>
  );
};

export default TiptapEditor;
