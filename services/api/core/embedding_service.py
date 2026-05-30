"""
TradeNexus API — Local Multilingual Embedding Service.

Uses sentence-transformers to generate 384-dimensional multilingual embeddings
for Indian languages natively (Hindi, Marathi, Gujarati, Telugu, Tamil, etc.).
"""

from typing import List
from functools import lru_cache


class EmbeddingService:
    """Local vector embedding service with lazy model loading."""

    def __init__(self):
        self._model = None
        self.model_name = "paraphrase-multilingual-MiniLM-L12-v2"
        self.dimension = 384

    @property
    def model(self):
        """Lazily load the sentence-transformers model to save memory and boot time."""
        if self._model is None:
            # We import here so we don't boot-load sentence-transformers unless a vector action occurs
            from sentence_transformers import SentenceTransformer
            print(f"[EmbeddingService] Loading local embedding model: {self.model_name}...")
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def get_embedding(self, text: str) -> List[float]:
        """Generate a 384-dimensional vector embedding for a single text input."""
        vector = self.model.encode(text, convert_to_numpy=True)
        return vector.tolist()

    def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate vector embeddings for a list of text inputs."""
        vectors = self.model.encode(texts, convert_to_numpy=True)
        return vectors.tolist()


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Return a cached singleton instance of the EmbeddingService."""
    return EmbeddingService()
