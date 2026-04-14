import re
from taskflowai import GroqModels, set_verbosity
import os
from dotenv import load_dotenv
from src.agentic.logger import logging
from src.agentic.exception import CustomException
import sys

# Load environment variables
load_dotenv()

# Validate required API keys
required_keys = [
    "GROQ_API_KEY"
]

# Check for missing keys
missing_keys = [key for key in required_keys if not os.getenv(key)]
if missing_keys:
    raise CustomException(sys, "Missing required environment variables: " + ', '.join(missing_keys))

# Set verbosity for taskflowai
set_verbosity(True)

class LoadModel:
    @classmethod
    def load_openai_model(cls):
        """
        Load and return the Groq Llama 3 70B model.
        """
        try:
            logging.info("Loading Groq Llama 3 70B model.")
            import functools
            model = functools.partial(GroqModels.call_groq, model="llama-3.3-70b-versatile")
            logging.info("Groq Llama 3.3 70B versatile model loaded successfully.")
            return model
        except Exception as e:
            logging.info("Failed to load Groq Llama 3 70B model")
            raise CustomException(sys, e)
