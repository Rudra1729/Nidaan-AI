import os
from langchain_community.document_loaders import TextLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer
import chromadb
from chromadb.config import Settings
from chromadb.utils import embedding_functions
import ollama

os.environ["TOKENIZERS_PARALLELISM"] = "false"

CHROMA_DB_DIR = "nidaan_chromadb"
COLLECTION_NAME = "rural_health_knowledge"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
EMBED_MODEL = "all-MiniLM-L6-v2"

# === 1. Load and Prepare Documents and Embeddings (do once) ===
def prepare_index(text_path):
    loader = TextLoader(text_path)
    documents = loader.load()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    texts = text_splitter.split_documents(documents)
    chunk_texts = [doc.page_content for doc in texts]

    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass  # ignore if doesn't exist
    collection = client.create_collection(name=COLLECTION_NAME, embedding_function=embedding_func)

    # Add documents (in ChromaDB you provide a list of documents, each with a unique id)
    ids = [f"chunk_{i}" for i in range(len(chunk_texts))]
    collection.add(
        documents=chunk_texts,
        ids=ids,
        metadatas=[{"chunk_id": i} for i in range(len(chunk_texts))]
    )
    print(f"Embedding index built with {len(chunk_texts)} chunks.")
    return client, collection, chunk_texts

# === 2. Load Index/Model for Chat Sessions ===
def load_index():
    client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
    embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)
    collection = client.get_or_create_collection(name=COLLECTION_NAME, embedding_function=embedding_func)
    # To retrieve all chunk_texts:
    # You may want to save chunk_texts on disk separately for efficiency, but we fetch here
    result = collection.get(include=["documents"])
    chunk_texts = result["documents"] if "documents" in result else []
    return client, collection, chunk_texts

# === 3. Chat Supporting Functions ===
def retrieve_context(query, collection, chunk_texts, top_k=5):
    # ChromaDB will internally embed the query and do similarity search
    results = collection.query(
        query_texts=[query],
        n_results=top_k
    )
    idxs = results["ids"][0]
    # Extract chunk IDs from ChromaDB result and fetch the actual text
    chunk_map = {f"chunk_{i}": chunk_texts[i] for i in range(len(chunk_texts))}
    return [chunk_map[idx] for idx in idxs]

def build_prompt(query, context):
    return f"""You are Nidaan AI — an offline AI nurse trained to help rural patients in India.

Answer the following question based ONLY on the context provided.

Context:
{chr(10).join(context)}

Question: {query}
Answer:"""

def query_gemma(prompt):
    response = ollama.chat(
        model='gemma3n:e2b',
        messages=[{'role': 'user', 'content': prompt}]
    )
    return response['message']['content']

# === 4. Main Chat Loop ===
def main():
    text_path = "rural_health_knowledge.txt"
    # Build or load the index
    if not os.path.exists(CHROMA_DB_DIR):
        client, collection, chunk_texts = prepare_index(text_path)
    else:
        client, collection, chunk_texts = load_index()

    print("🩺 Welcome to Nidaan AI! Type your health query, or type 'exit' to quit.\n")

    while True:
        query = input("You: ").strip()
        if query.lower() in ["exit", "quit"]:
            print("👋 Bye! Take care.")
            break
        context = retrieve_context(query, collection, chunk_texts)
        prompt = build_prompt(query, context)
        response = query_gemma(prompt)
        print(f"\n🤖 Nidaan AI Says:\n{response}\n")

if __name__ == "__main__":
    main()
