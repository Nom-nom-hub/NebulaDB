mod utils;
mod query;
mod document;
mod index;

use wasm_bindgen::prelude::*;
use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use query::Query;
use document::Document;
use index::{Index, IndexType};

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub struct Collection {
    name: String,
    documents: Vec<Document>,
    indexes: HashMap<String, Index>,
}

#[wasm_bindgen]
impl Collection {
    #[wasm_bindgen(constructor)]
    pub fn new(name: &str) -> Collection {
        utils::set_panic_hook();
        Collection {
            name: name.to_string(),
            documents: Vec::new(),
            indexes: HashMap::new(),
        }
    }

    pub fn name(&self) -> String {
        self.name.clone()
    }

    pub fn count(&self) -> usize {
        self.documents.len()
    }

    pub fn insert(&mut self, doc_str: &str) -> Result<String, JsValue> {
        let mut doc: Document = serde_json::from_str(doc_str)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse document: {}", e)))?;
        
        // Generate ID if not present
        if !doc.has_id() {
            doc.generate_id();
        }
        
        let id = doc.id().to_string();
        
        // Check if document with this ID already exists
        if self.documents.iter().any(|d| d.id() == id) {
            return Err(JsValue::from_str(&format!("Document with ID {} already exists", id)));
        }
        
        // Update indexes
        for (name, index) in &mut self.indexes {
            index.add_document(&doc)
                .map_err(|e| JsValue::from_str(&format!("Failed to update index {}: {}", name, e)))?;
        }
        
        // Add document
        self.documents.push(doc);
        
        Ok(id)
    }

    pub fn find(&self, query_str: &str) -> Result<String, JsValue> {
        let query: Query = if query_str.is_empty() {
            Query::empty()
        } else {
            serde_json::from_str(query_str)
                .map_err(|e| JsValue::from_str(&format!("Failed to parse query: {}", e)))?
        };
        
        // Use index if possible
        let results = if let Some((index_name, field)) = self.find_usable_index(&query) {
            log(&format!("Using index {} for field {}", index_name, field));
            let index = &self.indexes[index_name];
            index.query(&query)
        } else {
            // Full scan
            self.documents.iter()
                .filter(|doc| query.matches(doc))
                .cloned()
                .collect::<Vec<Document>>()
        };
        
        serde_json::to_string(&results)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize results: {}", e)))
    }

    pub fn find_one(&self, query_str: &str) -> Result<String, JsValue> {
        let query: Query = serde_json::from_str(query_str)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse query: {}", e)))?;
        
        // Use index if possible
        let result = if let Some((index_name, field)) = self.find_usable_index(&query) {
            log(&format!("Using index {} for field {}", index_name, field));
            let index = &self.indexes[index_name];
            index.query_one(&query)
        } else {
            // Full scan
            self.documents.iter()
                .find(|doc| query.matches(doc))
                .cloned()
        };
        
        match result {
            Some(doc) => serde_json::to_string(&doc)
                .map_err(|e| JsValue::from_str(&format!("Failed to serialize document: {}", e))),
            None => Ok("null".to_string())
        }
    }

    pub fn update(&mut self, query_str: &str, update_str: &str) -> Result<usize, JsValue> {
        let query: Query = serde_json::from_str(query_str)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse query: {}", e)))?;
        
        let update: serde_json::Value = serde_json::from_str(update_str)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse update: {}", e)))?;
        
        let mut count = 0;
        
        // Find matching documents
        let matching_docs: Vec<usize> = self.documents.iter()
            .enumerate()
            .filter(|(_, doc)| query.matches(doc))
            .map(|(i, _)| i)
            .collect();
        
        // Update documents
        for i in matching_docs {
            // Remove from indexes
            for (name, index) in &mut self.indexes {
                index.remove_document(&self.documents[i])
                    .map_err(|e| JsValue::from_str(&format!("Failed to update index {}: {}", name, e)))?;
            }
            
            // Apply update
            self.documents[i].apply_update(&update)
                .map_err(|e| JsValue::from_str(&format!("Failed to apply update: {}", e)))?;
            
            // Add back to indexes
            for (name, index) in &mut self.indexes {
                index.add_document(&self.documents[i])
                    .map_err(|e| JsValue::from_str(&format!("Failed to update index {}: {}", name, e)))?;
            }
            
            count += 1;
        }
        
        Ok(count)
    }

    pub fn delete(&mut self, query_str: &str) -> Result<usize, JsValue> {
        let query: Query = serde_json::from_str(query_str)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse query: {}", e)))?;
        
        let mut count = 0;
        
        // Find matching documents
        let matching_docs: Vec<usize> = self.documents.iter()
            .enumerate()
            .filter(|(_, doc)| query.matches(doc))
            .map(|(i, _)| i)
            .collect();
        
        // Delete documents in reverse order to avoid index issues
        for i in matching_docs.into_iter().rev() {
            // Remove from indexes
            for (name, index) in &mut self.indexes {
                index.remove_document(&self.documents[i])
                    .map_err(|e| JsValue::from_str(&format!("Failed to update index {}: {}", name, e)))?;
            }
            
            // Remove document
            self.documents.remove(i);
            count += 1;
        }
        
        Ok(count)
    }

    pub fn create_index(&mut self, name: &str, fields: &str, index_type_str: &str) -> Result<(), JsValue> {
        let fields: Vec<String> = serde_json::from_str(fields)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse fields: {}", e)))?;
        
        let index_type = match index_type_str {
            "single" => IndexType::Single,
            "unique" => IndexType::Unique,
            "multi" => IndexType::Multi,
            _ => return Err(JsValue::from_str(&format!("Invalid index type: {}", index_type_str)))
        };
        
        let mut index = Index::new(name, &fields, index_type);
        
        // Add existing documents to index
        for doc in &self.documents {
            index.add_document(doc)
                .map_err(|e| JsValue::from_str(&format!("Failed to add document to index: {}", e)))?;
        }
        
        self.indexes.insert(name.to_string(), index);
        
        Ok(())
    }

    pub fn drop_index(&mut self, name: &str) -> Result<bool, JsValue> {
        Ok(self.indexes.remove(name).is_some())
    }

    pub fn get_indexes(&self) -> Result<String, JsValue> {
        let index_names: Vec<String> = self.indexes.keys().cloned().collect();
        serde_json::to_string(&index_names)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize indexes: {}", e)))
    }

    pub fn to_json(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.documents)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize collection: {}", e)))
    }

    pub fn from_json(&mut self, json: &str) -> Result<(), JsValue> {
        let docs: Vec<Document> = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse JSON: {}", e)))?;
        
        // Clear existing documents and indexes
        self.documents.clear();
        for (_, index) in &mut self.indexes {
            index.clear();
        }
        
        // Add documents
        for doc in docs {
            self.documents.push(doc.clone());
            
            // Update indexes
            for (name, index) in &mut self.indexes {
                index.add_document(&doc)
                    .map_err(|e| JsValue::from_str(&format!("Failed to update index {}: {}", name, e)))?;
            }
        }
        
        Ok(())
    }

    // Find an index that can be used for this query
    fn find_usable_index(&self, query: &Query) -> Option<(&str, &str)> {
        for (name, index) in &self.indexes {
            if let Some(field) = index.can_use_for_query(query) {
                return Some((name, field));
            }
        }
        None
    }
}

#[wasm_bindgen]
pub struct Database {
    collections: HashMap<String, Collection>,
}

#[wasm_bindgen]
impl Database {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Database {
        utils::set_panic_hook();
        Database {
            collections: HashMap::new(),
        }
    }

    pub fn collection(&mut self, name: &str) -> Collection {
        if let Some(collection) = self.collections.get(name) {
            return collection.clone();
        }
        
        let collection = Collection::new(name);
        self.collections.insert(name.to_string(), collection.clone());
        collection
    }

    pub fn has_collection(&self, name: &str) -> bool {
        self.collections.contains_key(name)
    }

    pub fn drop_collection(&mut self, name: &str) -> bool {
        self.collections.remove(name).is_some()
    }

    pub fn get_collections(&self) -> Result<String, JsValue> {
        let collection_names: Vec<String> = self.collections.keys().cloned().collect();
        serde_json::to_string(&collection_names)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize collections: {}", e)))
    }

    pub fn to_json(&self) -> Result<String, JsValue> {
        let mut data = HashMap::new();
        
        for (name, collection) in &self.collections {
            let docs_json = collection.to_json()?;
            data.insert(name.clone(), serde_json::from_str::<serde_json::Value>(&docs_json)
                .map_err(|e| JsValue::from_str(&format!("Failed to parse collection JSON: {}", e)))?);
        }
        
        serde_json::to_string(&data)
            .map_err(|e| JsValue::from_str(&format!("Failed to serialize database: {}", e)))
    }

    pub fn from_json(&mut self, json: &str) -> Result<(), JsValue> {
        let data: HashMap<String, Vec<Document>> = serde_json::from_str(json)
            .map_err(|e| JsValue::from_str(&format!("Failed to parse JSON: {}", e)))?;
        
        // Clear existing collections
        self.collections.clear();
        
        // Add collections
        for (name, docs) in data {
            let mut collection = Collection::new(&name);
            let docs_json = serde_json::to_string(&docs)
                .map_err(|e| JsValue::from_str(&format!("Failed to serialize documents: {}", e)))?;
            collection.from_json(&docs_json)?;
            self.collections.insert(name, collection);
        }
        
        Ok(())
    }
}
