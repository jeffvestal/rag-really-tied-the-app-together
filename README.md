# The RAG Really Ties the App Together: UI

This repository contains the frontend for a RAG-based search application built with **Next.js** and **Elasticsearch**. 

*Note: The current code requires Elasticsearch **8.18+ or Serverless** .*

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
You will need npm installed. If you don't have npm installed, you can follow the guide at the [npmjs site](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

    npm install

### **3. Start the Development Server**

    npm run dev

### **4. Access the App**

Open  http://localhost:3000 in your browser.

*NOTE* If you have something else running using port 3000 your app will start using the next available port. Just look at the output to see what port it uses. 


[*OPTIONAL*] If you want it to run on a specific  port, say 4000 you can do so by running:

    PORT=4000 npm run dev

## Blog
For more information about the app, including how to use Open Crawler to index data see
- Part 1: [ChatGPT and Elasticsearch revisited: Building a chatbot using RAG](https://www.elastic.co/search-labs/blog/chatgpt-elasticsearch-rag-enhancements)
- Part 2: 
