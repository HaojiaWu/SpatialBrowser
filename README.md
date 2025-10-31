<p align="center">
  <img src="banner.png" alt="Spatial Browser Banner" width="100%">
</p>

# Spatial Browser
SpatialBrowser is a Flask web application for joint visualization of multimodal spatial transcriptomics data.
### 1. What this webapp looks like?
Click here to view the demo: https://spatial.humphreyslab.com/

### 2. How to make this webapp?
#### Install MongoDB
```bash
sudo apt update
sudo apt upgrade
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg –dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod

```
#### Install vips library
```bash
sudo apt install libvips
```
#### Install necessary python packages
```bash
pip install Flask pymongo google.generativeai functools
```
#### Align the histology/IF images with your transcriptomics data
Align the histology or immunofluorescence (IF) images with your transcriptomics data using the Xenium Browser for Xenium datasets or the Loupe Browser for Visium datasets. After alignment, save the aligned TIFF image, the cell-by-gene count matrix, and the cell coordinates. For the count matrix, use cells as rows and genes as columns, with the first column containing the cell ID. For the cell coordinates file, include only three columns: cell, x, and y.
#### Load the gene expression and cell coordinates into mongodb database
```python
import pandas as pd
from pymongo import MongoClient
from tqdm import tqdm
ct = pd.read_parquet("your_count_matrix.parquet")
cood = pd.read_csv("your_cell_coordinates.csv")

client = MongoClient('mongodb://localhost:27017/')
db = client['spatial']
collection = db['day42']

for gene in tqdm(ct.columns[1:], desc="Inserting genes into MongoDB"):
    filtered_df = ct[ct[gene] > 0][['cell', gene]]
    merged_df = pd.merge(filtered_df, cood, on='cell')
    document = {
        'gene': gene,
        'expr': merged_df[gene].tolist(),
        'x': merged_df['x'].tolist(),
        'y': merged_df['y'].tolist()
    }
collection.insert_one(document)
```
#### Dump the mongodb database
```sh
mongodump --host localhost --port 27017 --db spatial --out spatial_db
```
#### Restore the mongodb database on server
```sh
mongorestore --host localhost --port 27017 --db spatial your_db_dir
```
#### Prepare the tiled images
```sh
vips dzsave your_aligned_he.tiff he_image --suffix .jpeg
```
You are all set! Just transfer everything to the server and configure it to run your web app. You can find the code here: https://github.com/TheHumphreysLab/SpatialBrowser. For app development, I used Flask. For completion chatbot, I used Google Gemini API. 

