from elasticsearch import Elasticsearch

# Sample gene data
sample_genes = [
    {
        "value": {
            "gene_id": "ENSG00000139618",
            "gene_version": "1",
            "symbol": "BRCA2",
            "chrom": "13",
            "start": 32315474,
            "stop": 32400266,
            "xstart": 13032315474,
            "xstop": 13032400266
        },
        "gene_id": "ENSG00000139618",
        "symbol": "BRCA2",
        "symbol_upper_case": "BRCA2",
        "chrom": "13",
        "start": 32315474,
        "stop": 32400266,
        "xstart": 13032315474,
        "xstop": 13032400266
    },
    {
        "value": {
            "gene_id": "ENSG00000141510",
            "gene_version": "1",
            "symbol": "TP53",
            "chrom": "17",
            "start": 7661779,
            "stop": 7687550,
            "xstart": 17007661779,
            "xstop": 17007687550
        },
        "gene_id": "ENSG00000141510",
        "symbol": "TP53",
        "symbol_upper_case": "TP53",
        "chrom": "17",
        "start": 7661779,
        "stop": 7687550,
        "xstart": 17007661779,
        "xstop": 17007687550
    }
]

# Create Elasticsearch client
es = Elasticsearch(
    'http://localhost:9200',
    verify_certs=False,
    request_timeout=30,
    headers={'Content-Type': 'application/json'}
)

# Define index mapping
mapping = {
    "mappings": {
        "_doc": {
            "properties": {
                "gene_id": {"type": "keyword"},
                "symbol": {"type": "keyword"},
                "symbol_upper_case": {"type": "keyword"},
                "chrom": {"type": "keyword"},
                "start": {"type": "long"},
                "stop": {"type": "long"},
                "xstart": {"type": "long"},
                "xstop": {"type": "long"}
            }
        }
    }
}

try:
    # Check if index exists
    if not es.indices.exists(index='genes_grch37'):
        print("Creating index 'genes_grch37'...")
        es.indices.create(index='genes_grch37', body=mapping)
        print("Index created successfully")

    # Index the documents
    for gene in sample_genes:
        print(f"Indexing gene {gene['symbol']}...")
        es.index(index='genes_grch37', doc_type='_doc', body=gene)
        print(f"Successfully indexed gene {gene['symbol']}")

    print("All sample data has been loaded successfully!")

except Exception as e:
    print(f"An error occurred: {str(e)}") 