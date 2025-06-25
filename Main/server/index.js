import express from "express";
import cors from "cors";
import multer from "multer";

import path from "path"; // ✅ ADD THIS

import fs from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import "dotenv/config";

import { CohereEmbeddings } from "@langchain/cohere";
import { QdrantVectorStore } from "@langchain/qdrant";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

import { Queue } from "bullmq";

// Initialize BullMQ queue for file processing
const queue = new Queue("file-upload-queue", {
  connection: {
    host: "localhost", 
    port: 6379,     
  },
});

// Configure Multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  },
});
const upload = multer({ storage: storage });


const app = express();
app.use(cors());
app.use(express.json()); 


app.use("/uploads", express.static(join(__dirname, "uploads")));


app.get("/", (req, res) => {
  return res.json({ message: "Everything is Fine!" });
});


app.post("/upload/pdf", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded." });
  }

  // Add the file processing job to the BullMQ queue
  await queue.add(
    "file-ready", 
    JSON.stringify({ 
      filename: req.file.originalname,
      destination: req.file.destination,
      path: req.file.path,
    })
  );
  return res.json({ message: "File uploaded successfully" });
});


app.get("/uploaded-pdfs", (req, res) => {
  const uploadsDir = join(__dirname, "uploads");

  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      console.error("Error reading uploads directory:", err);
      return res.status(500).json({ error: "Could not read uploads directory." });
    }

    const pdfFiles = files.filter((file) => file.endsWith(".pdf"));

    const response = pdfFiles.map((fileName) => ({
      fileName,
      url: `http://localhost:8000/uploads/${fileName}`,
    }));

    res.json(response);
  });
});


const uploadsDir = path.join(__dirname, "uploads");

app.delete("/delete-pdf/:fileName", (req, res) => {
  const { fileName } = req.params;
  const filePath = path.join(uploadsDir, fileName);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error("Error deleting file:", err);
      return res.status(500).json({ error: "Failed to delete file." });
    }
    res.json({ success: true, message: "File deleted successfully." });
  });
});


// 🔁 /chat route for handling user queries and generating responses
app.post("/chat", async (req, res) => {
  try {
    const userQuery = req.body.question;
    if (!userQuery) {
      return res.status(400).json({ error: "Missing question in body." });
    }

    const embeddings = new CohereEmbeddings({
      model: "embed-english-v3.0",
      apiKey: process.env.COHERE_API_KEY,
    });


    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        url: "http://localhost:6333", // Qdrant URL
        collectionName: "langchainjs-testing", // Your Qdrant collection name
      }
    );

    const retriever = vectorStore.asRetriever({ k: 3 });
    const docs = await retriever.invoke(userQuery);
    const context = docs.map((doc) => doc.pageContent).join("\n---\n");


    const systemPrompt = `You are a helpful AI assistant. Answer clearly, concisely, and based on the context provided.`;
    const fullPrompt = `
${systemPrompt}

Context:
${context}

User Question:
${userQuery}
`;

    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash", 
      apiKey: process.env.GEMINI_API_KEY,
    });

    const response = await model.invoke(fullPrompt);

    let answer;
    if (typeof response === "string") {
      answer = response;
    } else if (response.content) {
      answer =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content); 
    } else if (response.text) {
      answer = response.text;
    } else {
      answer = JSON.stringify(response); 
    }

    if (answer && typeof answer === 'string') {
        answer = answer
          .replace(/```(?:\w+\n)?([\s\S]+?)```/g, '$1')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/__(.*?)__/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/_(.*?)_/g, '$1')
          .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
          .replace(/#+\s/g, '')
          .replace(/^\s*[\*\-\+]\s/gm, '• ')
          .replace(/\\n/g, '\n')
          .replace(/\n{2,}/g, '\n\n')
          .trim();
    }

    const finalAnswer = {
      question: userQuery,
      answer,
      contextUsed: context,
    };

    res.json(finalAnswer); 
  } catch (err) {
    console.error("❌ Error in /chat:", err); 
    res.status(500).json({ error: "Internal server error." }); 
  }
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});
