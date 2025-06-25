"use client";

import React, { useState, useEffect } from "react";
import { Upload, FileText, ExternalLink, File, XCircle } from "lucide-react"; // Import XCircle icon for delete

function FileUpload() {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [fileName, setFileName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);

  useEffect(() => {
    async function fetchUploads() {
      try {
        const res = await fetch("http://localhost:8000/uploaded-pdfs");
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setUploadedFiles(data);
      } catch (err) {
        console.error("Failed to fetch uploaded PDFs:", err);
      }
    }

    fetchUploads();
  }, []);

  const fileUploadButtonAction = () => {
    const ele = document.createElement("input");
    ele.setAttribute("type", "file");
    ele.setAttribute("accept", "application/pdf");

    ele.addEventListener("change", async (ev) => {
      const file = ev.target?.files?.[0];
      if (file) {
        const formData = new FormData();
        formData.append("pdf", file);
        setFileName(file.name);

        const localUrl = URL.createObjectURL(file);
        setPdfUrl(localUrl);

        try {
          const uploadRes = await fetch("http://localhost:8000/upload/pdf", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload failed with status: ${uploadRes.status}`);
          }

          const fetchRes = await fetch("http://localhost:8000/uploaded-pdfs");
          if (!fetchRes.ok) {
            throw new Error(
              `Failed to refresh list! status: ${fetchRes.status}`
            );
          }
          const data = await fetchRes.json();
          setUploadedFiles(data);
        } catch (err) {
          console.error("Upload failed:", err);
        }
      }
    });

    ele.click();
  };


  
  const handleDelete = async (fileToDelete) => {
  try {
    const res = await fetch(`http://localhost:8000/delete-pdf/${fileToDelete.fileName}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error("Server deletion failed.");
    }

    // Remove from local state
    setUploadedFiles((prevFiles) =>
      prevFiles.filter((file) => file.fileName !== fileToDelete.fileName)
    );

    if (pdfUrl && fileName === fileToDelete.fileName) {
      setPdfUrl(null);
      setFileName("");
    }
  } catch (err) {
    console.error("Error deleting file:", err);
  }
};


  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-950 to-black flex items-center justify-center p-6 font-sans">
      <div className="bg-gray-900 shadow-2xl rounded-2xl w-full max-w-xl p-8 flex flex-col gap-8 border border-gray-800 animate-fade-in">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-blue-400 mb-2 tracking-wide">
            📄 PDF Uploader
          </h1>
          <p className="text-gray-400 text-sm">
            Upload, preview, and manage your documents for analysis.
          </p>
        </div>

        <div className="w-full flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-blue-600 rounded-xl p-10 bg-gray-950 transition-all duration-300 ease-in-out hover:border-blue-500 hover:shadow-inner-xl">
          {pdfUrl ? (
            <>
              <FileText size={50} className="text-blue-400 animate-pop-in" />
              <p className="mt-4 text-white text-lg font-medium text-center truncate w-full px-2">
                {fileName}
              </p>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 text-base rounded-lg shadow-lg transition transform hover:scale-105"
              >
                <ExternalLink size={20} />
                Preview PDF
              </a>
            </>
          ) : (
            <>
              <File size={60} className="text-gray-600" />
              <p className="mt-3 text-base">No PDF selected</p>
              <p className="mt-1 text-sm text-gray-500">
                Click below to upload a file
              </p>
            </>
          )}
        </div>

        <div className="flex justify-center">
          <button
            onClick={fileUploadButtonAction}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl shadow-xl transition transform hover:scale-105 active:scale-95 text-lg font-bold"
          >
            <Upload size={24} />
            <span>Select PDF File</span>
          </button>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="mt-4 border-t border-gray-800 pt-6">
            <h2 className="text-white font-extrabold text-2xl mb-4">
              📚 Your Uploads:
            </h2>
            <ul className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {uploadedFiles.map((file, idx) => (
                <li
                  key={idx}
                  className="flex justify-between items-center bg-zinc-800 text-white p-4 rounded-lg shadow-md border border-zinc-700 transition-all duration-200 ease-in-out hover:bg-zinc-700"
                >
                  <span className="truncate flex-1 text-base">
                    {file.fileName}
                  </span>
                  <div className="flex items-center gap-3">
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline text-sm font-medium transition-colors hover:text-blue-300"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => handleDelete(file)}
                      className="text-red-400 hover:text-red-500 transition-colors"
                      aria-label={`Delete ${file.fileName}`}
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #333;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #555;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #777;
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        @keyframes pop-in {
          0% {
            opacity: 0;
            transform: scale(0.5);
          }
          75% {
            opacity: 1;
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
          }
        }
        .animate-pop-in {
          animation: pop-in 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default FileUpload;
