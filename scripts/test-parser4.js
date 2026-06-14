const { XMLParser } = require('fast-xml-parser');
const fs = require('fs');
const xml = fs.readFileSync('D:\\developer\\2025\\Backend\\research\\workspace\\projects\\active\\sast-integration\\scripts\\test-cppcheck.xml', 'utf-8');
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', parseAttributeValue: true, isArray: (name) => name === 'error' || name === 'location' });
const parsed = parser.parse(xml);
console.log('results.errors:', typeof parsed.results?.errors);
console.log('results.errors.error:', typeof parsed.results?.errors?.error);
const errors = parsed.results?.errors?.error;
if (errors) {
    const arr = Array.isArray(errors) ? errors : [errors];
    console.log('errors count:', arr.length);
    if (arr.length > 0) {
        const err = arr[0];
        console.log('First error:', JSON.stringify(err).substring(0, 500));
    }
}