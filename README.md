# The RAG Really Ties the App Together: UI

This repository contains the frontend for a RAG-based search application built with **Next.js** and **Elasticsearch**. 

It provides a web-based UI for running hybrid search queries, constructing LLM prompts, and displaying AI-generated responses.

![App UI](/public/ui-abides-darkmode.png)

## **Architecture Overview**
- **Next.js (React-based frontend)**: Handles UI rendering and API communication
- **Tailwind CSS**: Provides styling for a modern UI
- **API Routes (Serverless Functions)**: 
 - `/api/search` - Queries Elasticsearch for relevant documents
 - `/api/llm` - Constructs the prompt and streams responses from an LLM
- **Elasticsearch**: Used as a vector database for hybrid search (BM25 + Dense Vectors)
- **LLM Integration**: Calls an API-based LLM for AI-generated responses

## **Installation & Setup**

### **1. Clone the Repository**

    git clone https://github.com/jeffvestal/rag-really-tied-the-app-together.git
    cd rag-app

### **2. Install Dependencies**

    npm install

### **3. Set Up Environment Variables**

Create a `.env.local` file and add:

    NEXT_PUBLIC_ES_API_KEY=your-elasticsearch-api-key
    NEXT_PUBLIC_ES_API_URL=https://your-elastic-cloud-instance.com
    NEXT_PUBLIC_LLM_API_KEY=your-llm-api-key

### **4. Start the Development Server**

    npm run dev

### **5. Access the App**

Open  http://localhost:3000 in your browser.

## Blog
For more information about the app, including how to use Open Crawler to index data see
- Part 1: [ChatGPT and Elasticsearch revisited: Building a chatbot using RAG](https://www.elastic.co/search-labs/blog/chatgpt-elasticsearch-rag-enhancements)
- Part 2: 
