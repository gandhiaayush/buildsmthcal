"use client";

import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import type { AppointmentRow } from "@/types";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const REQUIRED_COLUMNS = ["patient_id", "patient_name", "appointment_time", "appointment_type", "doctor_name"];

interface CsvDropzoneProps {
  onParsed: (rows: AppointmentRow[]) => void;
}

export function CsvDropzone({ onParsed }: CsvDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      setError(null);
      setFileName(file.name);
      Papa.parse<AppointmentRow>(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          const headers = results.meta.fields ?? [];
          const missing = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
          if (missing.length > 0) {
            setError(`Missing required columns: ${missing.join(", ")}`);
            return;
          }
          onParsed(results.data as AppointmentRow[]);
        },
        error: (err) => setError(err.message),
      });
    },
    [onParsed]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file?.name.endsWith(".csv")) processFile(file);
      else setError("Please upload a .csv file");
    },
    [processFile]
  );

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer",
        dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400 bg-white"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) processFile(file);
        }}
      />

      {fileName ? (
        <div className="flex flex-col items-center gap-2">
          <FileText className="w-10 h-10 text-blue-500" />
          <p className="font-medium text-gray-900">{fileName}</p>
          <p className="text-sm text-gray-500">Click to upload a different file</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Upload className={cn("w-10 h-10", dragging ? "text-blue-500" : "text-gray-400")} />
          <div>
            <p className="font-medium text-gray-900">Drop your appointment CSV here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          </div>
          <p className="text-xs text-gray-400">
            Required: patient_id, patient_name, appointment_time, appointment_type, doctor_name
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 justify-center">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
