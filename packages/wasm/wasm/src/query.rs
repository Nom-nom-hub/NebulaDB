use serde::{Serialize, Deserialize};
use serde_json::Value;
use std::collections::HashMap;
use crate::document::Document;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Query {
    #[serde(flatten)]
    conditions: HashMap<String, Value>,
}

impl Query {
    pub fn empty() -> Self {
        Query {
            conditions: HashMap::new(),
        }
    }
    
    pub fn matches(&self, doc: &Document) -> bool {
        // Empty query matches everything
        if self.conditions.is_empty() {
            return true;
        }
        
        // Check each condition
        for (key, value) in &self.conditions {
            match key.as_str() {
                "$and" => {
                    if let Value::Array(and_conditions) = value {
                        for condition in and_conditions {
                            if let Value::Object(cond_obj) = condition {
                                let sub_query = Query {
                                    conditions: cond_obj.clone(),
                                };
                                if !sub_query.matches(doc) {
                                    return false;
                                }
                            }
                        }
                    }
                },
                "$or" => {
                    if let Value::Array(or_conditions) = value {
                        if or_conditions.is_empty() {
                            return true;
                        }
                        
                        let mut matches_any = false;
                        for condition in or_conditions {
                            if let Value::Object(cond_obj) = condition {
                                let sub_query = Query {
                                    conditions: cond_obj.clone(),
                                };
                                if sub_query.matches(doc) {
                                    matches_any = true;
                                    break;
                                }
                            }
                        }
                        
                        if !matches_any {
                            return false;
                        }
                    }
                },
                "$not" => {
                    if let Value::Object(not_condition) = value {
                        let sub_query = Query {
                            conditions: not_condition.clone(),
                        };
                        if sub_query.matches(doc) {
                            return false;
                        }
                    }
                },
                _ => {
                    // Regular field condition
                    if !self.field_matches(key, value, doc) {
                        return false;
                    }
                }
            }
        }
        
        true
    }
    
    pub fn field_matches(&self, field: &str, condition: &Value, doc: &Document) -> bool {
        let doc_value = doc.get(field);
        
        match condition {
            Value::Object(obj) => {
                // Check for operators
                for (op, op_value) in obj {
                    match op.as_str() {
                        "$eq" => {
                            if let Some(value) = doc_value {
                                if value != op_value {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        "$ne" => {
                            if let Some(value) = doc_value {
                                if value == op_value {
                                    return false;
                                }
                            }
                        },
                        "$gt" => {
                            if let Some(value) = doc_value {
                                if let (Value::Number(a), Value::Number(b)) = (value, op_value) {
                                    if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                        if a_f64 <= b_f64 {
                                            return false;
                                        }
                                    } else {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        "$gte" => {
                            if let Some(value) = doc_value {
                                if let (Value::Number(a), Value::Number(b)) = (value, op_value) {
                                    if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                        if a_f64 < b_f64 {
                                            return false;
                                        }
                                    } else {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        "$lt" => {
                            if let Some(value) = doc_value {
                                if let (Value::Number(a), Value::Number(b)) = (value, op_value) {
                                    if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                        if a_f64 >= b_f64 {
                                            return false;
                                        }
                                    } else {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        "$lte" => {
                            if let Some(value) = doc_value {
                                if let (Value::Number(a), Value::Number(b)) = (value, op_value) {
                                    if let (Some(a_f64), Some(b_f64)) = (a.as_f64(), b.as_f64()) {
                                        if a_f64 > b_f64 {
                                            return false;
                                        }
                                    } else {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        "$in" => {
                            if let Some(value) = doc_value {
                                if let Value::Array(arr) = op_value {
                                    if !arr.contains(value) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        "$nin" => {
                            if let Some(value) = doc_value {
                                if let Value::Array(arr) = op_value {
                                    if arr.contains(value) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            }
                        },
                        "$exists" => {
                            if let Value::Bool(should_exist) = op_value {
                                if *should_exist && doc_value.is_none() {
                                    return false;
                                }
                                if !*should_exist && doc_value.is_some() {
                                    return false;
                                }
                            }
                        },
                        "$regex" => {
                            if let Some(Value::String(s)) = doc_value {
                                if let Value::String(pattern) = op_value {
                                    // Simple regex implementation
                                    // In a real implementation, we would use a proper regex engine
                                    if !s.contains(pattern) {
                                        return false;
                                    }
                                } else {
                                    return false;
                                }
                            } else {
                                return false;
                            }
                        },
                        _ => {
                            // Unknown operator
                            return false;
                        }
                    }
                }
                
                true
            },
            _ => {
                // Simple equality check
                if let Some(value) = doc_value {
                    value == condition
                } else {
                    false
                }
            }
        }
    }
    
    pub fn get_field_value(&self, field: &str) -> Option<&Value> {
        self.conditions.get(field)
    }
    
    pub fn has_simple_equality(&self, field: &str) -> bool {
        if let Some(value) = self.conditions.get(field) {
            !value.is_object()
        } else {
            false
        }
    }
    
    pub fn has_equality_operator(&self, field: &str) -> Option<&Value> {
        if let Some(Value::Object(obj)) = self.conditions.get(field) {
            obj.get("$eq")
        } else {
            None
        }
    }
}
