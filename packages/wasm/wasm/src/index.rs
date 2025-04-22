use std::collections::{HashMap, HashSet};
use serde_json::Value;
use crate::document::Document;
use crate::query::Query;

#[derive(Debug, Clone)]
pub enum IndexType {
    Single,
    Unique,
    Multi,
}

#[derive(Debug, Clone)]
pub struct Index {
    name: String,
    fields: Vec<String>,
    index_type: IndexType,
    // For single/unique indexes: field_value -> document_id
    single_index: HashMap<String, String>,
    // For multi indexes: field_value -> set of document_ids
    multi_index: HashMap<String, HashSet<String>>,
}

impl Index {
    pub fn new(name: &str, fields: &[String], index_type: IndexType) -> Self {
        Index {
            name: name.to_string(),
            fields: fields.to_vec(),
            index_type,
            single_index: HashMap::new(),
            multi_index: HashMap::new(),
        }
    }
    
    pub fn add_document(&mut self, doc: &Document) -> Result<(), String> {
        let key = self.get_index_key(doc)?;
        
        match self.index_type {
            IndexType::Single | IndexType::Unique => {
                if let Some(existing_id) = self.single_index.get(&key) {
                    if self.index_type == IndexType::Unique && existing_id != doc.id() {
                        return Err(format!("Duplicate key '{}' for unique index '{}'", key, self.name));
                    }
                }
                
                self.single_index.insert(key, doc.id().to_string());
            },
            IndexType::Multi => {
                let entry = self.multi_index.entry(key).or_insert_with(HashSet::new);
                entry.insert(doc.id().to_string());
            }
        }
        
        Ok(())
    }
    
    pub fn remove_document(&mut self, doc: &Document) -> Result<(), String> {
        let key = self.get_index_key(doc)?;
        
        match self.index_type {
            IndexType::Single | IndexType::Unique => {
                if let Some(id) = self.single_index.get(&key) {
                    if id == doc.id() {
                        self.single_index.remove(&key);
                    }
                }
            },
            IndexType::Multi => {
                if let Some(ids) = self.multi_index.get_mut(&key) {
                    ids.remove(doc.id());
                    if ids.is_empty() {
                        self.multi_index.remove(&key);
                    }
                }
            }
        }
        
        Ok(())
    }
    
    pub fn clear(&mut self) {
        self.single_index.clear();
        self.multi_index.clear();
    }
    
    pub fn can_use_for_query(&self, query: &Query) -> Option<&str> {
        // Check if any of the indexed fields are used in the query
        for field in &self.fields {
            // Check for simple equality
            if query.has_simple_equality(field) {
                return Some(field);
            }
            
            // Check for $eq operator
            if query.has_equality_operator(field).is_some() {
                return Some(field);
            }
        }
        
        None
    }
    
    pub fn query(&self, query: &Query) -> Vec<Document> {
        let mut results = Vec::new();
        
        // Find the field we can use
        for field in &self.fields {
            let field_value = if query.has_simple_equality(field) {
                query.get_field_value(field)
            } else if let Some(eq_value) = query.has_equality_operator(field) {
                Some(eq_value)
            } else {
                None
            };
            
            if let Some(value) = field_value {
                let key = self.value_to_string(value);
                
                match self.index_type {
                    IndexType::Single | IndexType::Unique => {
                        if let Some(doc_id) = self.single_index.get(&key) {
                            // We would need to fetch the document by ID here
                            // For now, we'll just create a placeholder
                            let mut doc = Document::new();
                            // In a real implementation, we would fetch the full document
                            results.push(doc);
                        }
                    },
                    IndexType::Multi => {
                        if let Some(doc_ids) = self.multi_index.get(&key) {
                            for doc_id in doc_ids {
                                // We would need to fetch the document by ID here
                                // For now, we'll just create a placeholder
                                let mut doc = Document::new();
                                // In a real implementation, we would fetch the full document
                                results.push(doc);
                            }
                        }
                    }
                }
                
                // We found a usable field, no need to check others
                break;
            }
        }
        
        // Filter results to match the full query
        results.into_iter().filter(|doc| query.matches(doc)).collect()
    }
    
    pub fn query_one(&self, query: &Query) -> Option<Document> {
        self.query(query).into_iter().next()
    }
    
    fn get_index_key(&self, doc: &Document) -> Result<String, String> {
        if self.fields.len() == 1 {
            // Single field index
            let field = &self.fields[0];
            let value = doc.get(field);
            
            if let Some(value) = value {
                Ok(self.value_to_string(value))
            } else {
                Err(format!("Field '{}' not found in document", field))
            }
        } else {
            // Compound index
            let mut key_parts = Vec::new();
            
            for field in &self.fields {
                let value = doc.get(field);
                
                if let Some(value) = value {
                    key_parts.push(self.value_to_string(value));
                } else {
                    key_parts.push("null".to_string());
                }
            }
            
            Ok(key_parts.join("|"))
        }
    }
    
    fn value_to_string(&self, value: &Value) -> String {
        match value {
            Value::Null => "null".to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => n.to_string(),
            Value::String(s) => s.clone(),
            Value::Array(_) => serde_json::to_string(value).unwrap_or_else(|_| "[]".to_string()),
            Value::Object(_) => serde_json::to_string(value).unwrap_or_else(|_| "{}".to_string()),
        }
    }
}
