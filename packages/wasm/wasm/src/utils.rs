pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}

// Generate a random UUID v4
pub fn generate_uuid() -> String {
    use js_sys::{Math, Array, Uint8Array};
    
    let bytes = Uint8Array::new_with_length(16);
    
    // Fill with random values
    for i in 0..16 {
        bytes.set_index(i, (Math::random() * 256.0) as u8);
    }
    
    // Set version (4) and variant bits
    bytes.set_index(6, (bytes.get_index(6) & 0x0f) | 0x40);
    bytes.set_index(8, (bytes.get_index(8) & 0x3f) | 0x80);
    
    // Convert to hex string with dashes
    let hex = |b: u8| -> String {
        format!("{:02x}", b)
    };
    
    format!(
        "{}{}{}{}-{}{}-{}{}-{}{}-{}{}{}{}{}{}",
        hex(bytes.get_index(0)),
        hex(bytes.get_index(1)),
        hex(bytes.get_index(2)),
        hex(bytes.get_index(3)),
        hex(bytes.get_index(4)),
        hex(bytes.get_index(5)),
        hex(bytes.get_index(6)),
        hex(bytes.get_index(7)),
        hex(bytes.get_index(8)),
        hex(bytes.get_index(9)),
        hex(bytes.get_index(10)),
        hex(bytes.get_index(11)),
        hex(bytes.get_index(12)),
        hex(bytes.get_index(13)),
        hex(bytes.get_index(14)),
        hex(bytes.get_index(15))
    )
}
