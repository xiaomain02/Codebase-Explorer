import os
import logging
import json
import re
from pathlib import Path
from typing import Optional, List
from llama_cpp import Llama
from huggingface_hub import hf_hub_download

from app.core.config import BASE_DIR

logger = logging.getLogger(__name__)

MODEL_REPO = "Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF"
MODEL_FILE = "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"
MODEL_DIR = BASE_DIR / "models"

class LLMService:
    def __init__(self, n_ctx: int = 2048, n_gpu_layers: int = 0):
        self.model_dir = MODEL_DIR
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = self.model_dir / MODEL_FILE
        self.n_ctx = n_ctx
        self.n_gpu_layers = n_gpu_layers

        if not self.model_path.exists():
            logger.info(f"📥 Model not found. Downloading {MODEL_FILE} (~1.05 GB)...")
            hf_hub_download(
                repo_id=MODEL_REPO, 
                filename=MODEL_FILE, 
                local_dir=str(self.model_dir), 
                resume_download=True
            )
            logger.info("✅ Model downloaded successfully.")

        logger.info("🧠 Loading Qwen-Coder into memory...")
        self.llm = Llama(
            model_path=str(self.model_path),
            n_ctx=n_ctx,
            n_gpu_layers=n_gpu_layers,
            chat_format="chatml",
            verbose=False,
            offload_kqv=True,
            n_threads=max(1, os.cpu_count() - 1) if os.cpu_count() else 2
        )
        logger.info("✅ LLMService initialized and ready.")

    def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        try:
            messages = [
                {"role": "system", "content": system_prompt or "Ты — эксперт по анализу кода. Отвечай ТОЛЬКО на русском языке, чётко, по делу и строго на основе предоставленного контекста."},
                {"role": "user", "content": prompt}
            ]
            response = self.llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.2,
                top_p=0.9,
                repeat_penalty=1.1,
                stop=["<|im_end|>", "\n\nUser:", "\n\nВопрос:"]  # Стоп-токены для Qwen
            )
            return response["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"❌ LLM generation error: {e}")
            return f"⚠️ Ошибка генерации ответа: {str(e)}"

    def safe_truncate(self, text: str, reserve_tokens: int = 256) -> str:
        max_chars = int((self.n_ctx - reserve_tokens) * 2.8)
        if len(text) > max_chars:
            logger.warning(f"⚠️ Context truncated: {len(text)} -> {max_chars} chars")
            return text[:max_chars] + "\n\n[... контекст обрезан из-за ограничений окна ...]"
        return text
    
    def describe_file(self, file_content: str, file_path: str, language: str = "python") -> dict:
        safe_content = self.safe_truncate(file_content, reserve_tokens=512)  # Уменьшено для экономии контекста
        
        prompt = (
            f"Ты — эксперт по анализу кода на языке {language}. Проанализируй файл `{file_path}` и верни ТОЛЬКО валидный JSON на русском языке.\n\n"
            "СТРОГО следуй этой схеме (без лишних слов, только JSON):\n"
            "{\n"
            '  "summary": "Краткое описание назначения файла на русском (1-2 предложения)",\n'
            '  "classes": [\n'
            '    {"name": "ИмяКласса", "description": "Что делает этот класс, на русском"}\n'
            "  ],\n"
            '  "functions": [\n'
            '    {"name": "имя_функции", "description": "Что делает эта функция, на русском"}\n'
            "  ],\n"
            '  "imports": ["модуль1", "модуль2.подмодуль"]\n'
            "}\n\n"
            "ПРАВИЛА:\n"
            "- ВСЕ текстовые поля — ТОЛЬКО на русском языке.\n"
            "- Если классов/функций нет — верни пустой массив [].\n"
            "- В imports указывай только имена модулей, без 'import' и 'from'.\n"
            "- Не добавляй никаких пояснений, маркдауна или текста вне JSON.\n\n"
            f"Код файла:\n```{language}\n{safe_content}\n```\n\n"
            "JSON-ответ:"
        )
        
        try:
            response = self.llm.create_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=800,
                temperature=0.1,
                top_p=0.9,
                repeat_penalty=1.1,
                stop=["<|im_end|>"]
            )
            raw_answer = response["choices"][0]["message"]["content"].strip()
            
            cleaned = re.sub(r'^```(?:json)?\s*|\s*```$', '', raw_answer, flags=re.MULTILINE).strip()
            
            if not cleaned.startswith('{'):
                match = re.search(r'\{.*\}', cleaned, re.DOTALL)
                if match:
                    cleaned = match.group(0)
            
            result = json.loads(cleaned)
            
        except Exception as e:
            logger.error(f"LLM error: {e}")
            result = {"summary": f"Ошибка: {str(e)}", "classes": [], "functions": [], "imports": []}
        
        def to_dict_list(items):
            if not isinstance(items, list):
                return []
            out = []
            for it in items:
                if isinstance(it, dict):
                    out.append({
                        "name": str(it.get("name", "")).strip(),
                        "description": str(it.get("description", "")).strip()
                    })
                elif isinstance(it, str) and it.strip():
                    out.append({"name": it.strip(), "description": ""})
            return out
        
        def to_str_list(items):
            if not isinstance(items, list):
                return []
            return [str(x).strip() for x in items if isinstance(x, str) and x.strip()]
        
        return {
            "summary": str(result.get("summary", "")).strip(),
            "classes": to_dict_list(result.get("classes")),
            "functions": to_dict_list(result.get("functions")),
            "imports": to_str_list(result.get("imports"))
        }