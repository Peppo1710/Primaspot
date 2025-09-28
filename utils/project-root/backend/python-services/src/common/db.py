# src/common/db.py
import logging
from pymongo import MongoClient
from src.common.config import PY_MONGO_URI, DB_NAME

_logger = logging.getLogger(__name__)

_client = None
_db = None

def get_client():
    global _client
    if _client is None:
        _client = MongoClient(PY_MONGO_URI)
        _logger.info("MongoClient connected to %s", PY_MONGO_URI)
    return _client

def get_db():
    global _db
    if _db is None:
        _db = get_client()[DB_NAME]
    return _db

def get_collection(name: str):
    return get_db()[name]
