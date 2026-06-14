const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const xml = fs.readFileSync('D:\\developer\\2025\\Backend\\research\\workspace\\projects\\active\\sast-integration\\scripts\\test-cppcheck.xml', 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true, isArray: (name) => name === 'error' || name === 'location' });
const parsed = parser.parse(xml);
console.log('Top level keys:', Object.keys(parsed));
console.log('results keys:', Object.keys(parsed.results || {}));
const errors = parsed.results?.error;
console.log('error type:', typeof errors, 'is array:', Array.isArray(errors));
if (errors) {
    const arr = Array.isArray(errors) ? errors : [errors];
    console.log('errors count:', arr.length);
    if (arr.length > 0) {
        const err = arr[0];
        console.log('First error keys:', Object.keys(err));
        const locs = err.location ?? [];
        console.log('locations count:', locs.length);
        if (locs.length > 0) {
            console.log('first loc:', JSON.stringify(locs[0]));
        }
    }
}