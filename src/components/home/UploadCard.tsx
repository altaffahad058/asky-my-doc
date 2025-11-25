import { ChangeEvent, MutableRefObject } from "react";

type UploadCardProps = {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function UploadCard({
  fileInputRef,
  isUploading,
  onFileChange,
}: UploadCardProps) {
  return (
    <div className="card">
      <h1 className="text-2xl">Welcome to Ask My Doc</h1>
      <p className="muted mt-2">
        Upload text documents like notes, articles, or books. Then chat to
        extract insights, summarize sections, find references, or get direct
        answers grounded in your content.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.pdf,.docx"
          onChange={onFileChange}
          className="hidden"
        />
        <button
          type="button"
          className="button cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? "Uploading…" : "Upload document"}
        </button>
      </div>
    </div>
  );
}

