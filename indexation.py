from __future__ import print_function


import gutenbergpy.textget
from gutenbergpy.gutenbergcache import GutenbergCache
import json
from elasticsearch import Elasticsearch
import time
import statistics

def fill_book_with_content(book):
    id = book['id']
    fulltext = gutenbergpy.textget.strip_headers(gutenbergpy.textget.get_text_by_id(id)).decode('ASCII', errors='ignore')
    book['content'] = fulltext

NUMBER_OF_BOOKS_TO_INDEX=10000

# ELASTIC_USER = 'elastic'
# ELASTIC_PASSWORD = 'elastic'
# ELASTIC_ADDRESS = 'localhost:9200'

# es = Elasticsearch([f'http://{ELASTIC_USER}:{ELASTIC_PASSWORD}@{ELASTIC_ADDRESS}/'])
es = Elasticsearch()
cache = GutenbergCache.get_cache()

with open('parsed.json') as books_json:
    books_list = json.load(books_json)
    for book in books_list[:NUMBER_OF_BOOKS_TO_INDEX]:
        id = book['id']
        try:
            fill_book_with_content(book)
            res = es.index(index="books", id=id, body=book)
            print(res)
        except:
            print(f'Cannot obtain fulltext for book with id {id}.')