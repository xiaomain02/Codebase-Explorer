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

MODEL_REPO = "bartowski/Llama-3.2-3B-Instruct-GGUF"
MODEL_FILE = "Llama-3.2-3B-Instruct-Q4_K_M.gguf"
MODEL_DIR = BASE_DIR / "models"

class LLMService:
    def __init__(self, n_ctx: int = 4096, n_gpu_layers: int = 0):
        self.model_dir = MODEL_DIR
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = self.model_dir / MODEL_FILE
        self.n_ctx = n_ctx
        self.n_gpu_layers = n_gpu_layers

        if not self.model_path.exists():
            logger.info(f"📥 Model not found. Downloading {MODEL_FILE} (~1.9 GB)...")
            hf_hub_download(
                repo_id=MODEL_REPO, 
                filename=MODEL_FILE, 
                local_dir=str(self.model_dir), 
                resume_download=True
            )
            logger.info("✅ Model downloaded successfully.")

        logger.info("🧠 Loading model into memory (CPU-optimized)...")
        self.llm = Llama(
            model_path=str(self.model_path),
            n_ctx=n_ctx,
            n_gpu_layers=n_gpu_layers,
            chat_format="llama-3",
            verbose=False,
            offload_kqv=True,
            n_threads=max(1, os.cpu_count() - 1) if os.cpu_count() else 2
        )
        logger.info("✅ LLMService initialized and ready.")

    def generate(self, prompt: str, system_prompt: Optional[str] = None, max_tokens: int = 512) -> str:
        try:
            messages = [
                {"role": "system", "content": system_prompt or "Ты — эксперт по анализу кода. Отвечай чётко, по делу и строго на основе предоставленного контекста."},
                {"role": "user", "content": prompt}
            ]
            response = self.llm.create_chat_completion(
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.2,
                top_p=0.9,
                repeat_penalty=1.1,
                stop=["<|eot_id|>"]
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
        safe_content = self.safe_truncate(file_content, reserve_tokens=1024)
        
        prompt = (
            f"Ты — эксперт по анализу кода на языке {language}. "
            f"Проанализируй файл `{file_path}` и верни ТОЛЬКО валидный JSON без лишнего текста.\n\n"
            "Строго следуй этой схеме ответа:\n"
            "{\n"
            '  "summary": "Краткое описание назначения файла (1-2 предложения)",\n'
            '  "classes": [\n'
            '    {"name": "ClassName", "description": "Что делает этот класс"}\n'
            "  ],\n"
            '  "functions": [\n'
            '    {"name": "function_name", "description": "Что делает эта функция"}\n'
            "  ],\n"
            '  "imports": ["module1", "module2.submodule"]\n'
            "}\n\n"
            "Правила:\n"
            "- Если классов/функций нет — верни пустой массив [], а не строки.\n"
            "- В поле imports указывай только имена модулей, без 'import' и 'from'.\n"
            "- Не добавляй никаких пояснений, только JSON.\n\n"
            f"Код файла:\n```{language}\n{safe_content}\n```\n\n"
            "JSON-ответ:"
        )
        
        try:
            response = self.llm.create_chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.1,
                top_p=0.9,
                repeat_penalty=1.1,
                stop=None
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
                    out.append({"name": str(it.get("name", "")), "description": str(it.get("description", ""))})
                elif isinstance(it, str):
                    out.append({"name": it, "description": ""})
            return out
        
        def to_str_list(items):
            if not isinstance(items, list):
                return []
            return [str(x) for x in items if isinstance(x, str)]
        
        return {
            "summary": str(result.get("summary", "")),
            "classes": to_dict_list(result.get("classes")),
            "functions": to_dict_list(result.get("functions")),
            "imports": to_str_list(result.get("imports"))
        }