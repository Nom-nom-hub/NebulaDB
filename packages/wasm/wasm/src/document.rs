use serde::{Serialize, Deserialize};
use serde_json::Value;
use std::collections::HashMap;
use wasm_bindgen::prelude::*;
use crate::utils;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Document {
    #[serde(rename = "id")]
    id: String,
    #[serde(flatten)]
    data: HashMap<String, Value>,
}

impl Document {
    pub fn new() -> Self {
        let mut doc = Document {
            id: String::new(),
            data: HashMap::new(),
        };
        doc.generate_id();
        doc
    }
    
    pub fn id(&self) -> &str {
        &self.id
    }
    
    pub fn has_id(&self) -> bool {
        !self.id.is_empty()
    }
    
    pub fn generate_id(&mut self) {
        self.id = utils::generate_uuid();
    }
    
    pub fn get(&self, path: &str) -> Option<&Value> {
        if path == "id" {
            return Some(&Value::String(self.id.clone()));
        }
        
        let parts: Vec<&str> = path.split('.').collect();
        let mut current = &self.data;
        let mut value: Option<&Value> = None;
        
        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                // Last part
                value = current.get(*part);
            } else {
                // Navigate to nested object
                match current.get(*part) {
                    Some(Value::Object(obj)) => {
                        current = obj;
                    },
                    _ => return None,
                }
            }
        }
        
        value
    }
    
    pub fn apply_update(&mut self, update: &Value) -> Result<(), String> {
        if let Value::Object(update_obj) = update {
            // Handle $set operator
            if let Some(Value::Object(set_obj)) = update_obj.get("$set") {
                for (key, value) in set_obj {
                    if key == "id" {
                        return Err("Cannot update id field".to_string());
                    }
                    self.set_value(key, value.clone());
                }
            }
            
            // Handle $unset operator
            if let Some(Value::Object(unset_obj)) = update_obj.get("$unset") {
                for (key, _) in unset_obj {
                    if key == "id" {
                        return Err("Cannot unset id field".to_string());
                    }
                    self.data.remove(key);
                }
            }
            
            // Handle $inc operator
            if let Some(Value::Object(inc_obj)) = update_obj.get("$inc") {
                for (key, value) in inc_obj {
                    if key == "id" {
                        return Err("Cannot increment id field".to_string());
                    }
                    
                    let current = self.data.get(key).cloned().unwrap_or(Value::Number(serde_json::Number::from(0)));
                    
                    match (current, value) {
                        (Value::Number(n1), Value::Number(n2)) => {
                            if let (Some(f1), Some(f2)) = (n1.as_f64(), n2.as_f64()) {
                                self.data.insert(key.clone(), Value::Number(serde_json::Number::from_f64(f1 + f2).unwrap()));
                            }
                        },
                        _ => return Err(format!("Cannot increment non-numeric field: {}", key)),
                    }
                }
            }
            
            // Handle $push operator
            if let Some(Value::Object(push_obj)) = update_obj.get("$push") {
                for (key, value) in push_obj {
                    if key == "id" {
                        return Err("Cannot push to id field".to_string());
                    }
                    
                    let current = self.data.get(key).cloned();
                    
                    match current {
                        Some(Value::Array(mut arr)) => {
                            arr.push(value.clone());
                            self.data.insert(key.clone(), Value::Array(arr));
                        },
                        None => {
                            // Create new array
                            self.data.insert(key.clone(), Value::Array(vec![value.clone()]));
                        },
                        _ => return Err(format!("Cannot push to non-array field: {}", key)),
                    }
                }
            }
            
            // Handle $pull operator
            if let Some(Value::Object(pull_obj)) = update_obj.get("$pull") {
                for (key, value) in pull_obj {
                    if key == "id" {
                        return Err("Cannot pull from id field".to_string());
                    }
                    
                    if let Some(Value::Array(arr)) = self.data.get_mut(key) {
                        *arr = arr.iter()
                            .filter(|item| !item_matches(item, value))
                            .cloned()
                            .collect();
                    }
                }
            }
            
            Ok(())
        } else {
            Err("Update must be an object".to_string())
        }
    }
    
    fn set_value(&mut self, path: &str, value: Value) {
        let parts: Vec<&str> = path.split('.').collect();
        
        if parts.len() == 1 {
            // Simple case
            self.data.insert(path.to_string(), value);
            return;
        }
        
        // Handle nested path
        let mut current = &mut self.data;
        
        for (i, part) in parts.iter().enumerate() {
            if i == parts.len() - 1 {
                // Last part
                current.insert(part.to_string(), value);
                return;
            }
            
            // Ensure path exists
            if !current.contains_key(*part) {
                current.insert(part.to_string(), Value::Object(HashMap::new()));
            }
            
            // Navigate to nested object
            if let Some(Value::Object(obj)) = current.get_mut(*part) {
                current = obj;
            } else {
                // Replace non-object with object
                let new_obj = HashMap::new();
                current.insert(part.to_string(), Value::Object(new_obj));
                
                if let Some(Value::Object(obj)) = current.get_mut(*part) {
                    current = obj;
                }
            }
        }
    }
}

// Check if an item matches a query value
fn item_matches(item: &Value, query: &Value) -> bool {
    match query {
        Value::Object(query_obj) => {
            // Check if query is a complex query
            for (op, value) in query_obj {
                match op.as_str() {
                    "$eq" => return item == value,
                    "$ne" => return item != value,
                    "$gt" => {
                        if let (Value::Number(a), Value::Number(b)) = (item, value) {
                            if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                return a_f64 > b_f64;
                            }
                        }
                        return false;
                    },
                    "$gte" => {
                        if let (Value::Number(a), Value::Number(b)) = (item, value) {
                            if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                return a_f64 >= b_f64;
                            }
                        }
                        return false;
                    },
                    "$lt" => {
                        if let (Value::Number(a), Value::Number(b)) = (item, value) {
                            if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                return a_f64 < b_f64;
                            }
                        }
                        return false;
                    },
                    "$lte" => {
                        if let (Value::Number(a), Value::Number(b)) = (item, value) {
                            if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                return a_f64 <= b_f64;
                            }
                        }
                        return false;
                    },
                    "$in" => {
                        if let Value::Array(arr) = value {
                            return arr.contains(item);
                        }
                        return false;
                    },
                    "$nin" => {
                        if let Value::Array(arr) = value {
                            return !arr.contains(item);
                        }
                        return false;
                    },
                    _ => {}
                }
            }
            
            // Simple equality check
            item == query
        },
        _ => item == query,
    }
}
