import { ChangeEvent, MutableRefObject } from "react";
import { Upload } from "lucide-react";

type UploadCardProps = {
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  isUploading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  userFullName?: string;
};

export function UploadCard({
  fileInputRef,
  isUploading,
  onFileChange,
  userFullName,
}: UploadCardProps) {
  const heading = userFullName
    ? `Welcome ${userFullName},`
    : "Welcome to Ask My Doc,";

  return (
    <div className="card">
      <h1 className="text-2xl">{heading}</h1>
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
          className="button cursor-pointer flex items-center justify-center gap-2"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          aria-label={isUploading ? "Uploading document…" : "Upload document"}
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

