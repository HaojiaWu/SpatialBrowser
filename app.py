from flask import Flask, render_template, jsonify, request, redirect, url_for, session, flash
from pymongo import MongoClient
from functools import wraps
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key' 

genai.configure(api_key="your_api_key")

client1 = MongoClient('mongodb://localhost:27017/')
db1 = client1['timepoint1']

client2 = MongoClient('mongodb://localhost:27017/')
db2 = client2['timepoint2']

client3 = MongoClient('mongodb://localhost:27017/')
gene_info_db = client3['gene_info']  
gene_info_collection = gene_info_db['gene_info_cache']  


def home():
    return render_template('index.html')

@app.route('/get_gene_expression')
def get_gene_expression():
    gene = request.args.get('gene')
    db_name = request.args.get('db')
    collection_name = request.args.get('collection')

    if db_name == 'timepoint1':
        collection = db1[collection_name]
    elif db_name == 'timepoint2':
        collection = db2[collection_name]
    else:
        return jsonify([])

    gene_data = list(collection.find({'gene': gene}, {'_id': 0, 'expr': 1, 'x': 1, 'y': 1}))
    return jsonify(gene_data)

@app.route('/get_gene_info', methods=['POST'])
def get_gene_info():
    gene_name = request.form['gene_input'].strip().lower()  
    cached_info = gene_info_collection.find_one({'gene': {'$regex': f'^{gene_name}$', '$options': 'i'}})
    if cached_info:
        return jsonify({'response': cached_info['geneinfo']})

if __name__ == '__main__':
    app.run(debug=True)
